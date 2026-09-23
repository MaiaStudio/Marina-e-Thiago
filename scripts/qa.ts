import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
async function main() {
  await mkdir('reports/qa', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors: string[] = [];
  const report: Record<string, unknown> = {};
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  report.initialRequests = await page.evaluate(() => performance.getEntriesByType('resource').filter(e => e.name.includes('/media/')).map(e => e.name));
  await page.screenshot({ path: 'reports/qa/mobile-entry.png' });
  await page.getByRole('button', { name: 'Abrir convite' }).tap();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: 'reports/qa/mobile-preparation-title.png' });
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'preparacao');
  const shots: [string,string,number][] = [['preparation','.preparation-spread',0],['rail','.rail-scene',.5],['portal','.portal-scene',.78],['encounter-horizontal','.portal-scene',.85],['ceremony','.ceremony-wide',0],['handoff','.handoff-scene',.85],['rings','.rings-spread',0],['yes','.hero-scene',.8],['party','.party-title-wrap',0],['party-cluster','.party-duet',0],['party-peak','.party-peak',0],['final','.final-scene',.95]];
  for (const [name, selector, progress] of shots) {
    await page.locator(selector).evaluate((e,p) => window.scrollTo({ top: e.getBoundingClientRect().top + scrollY + (e.getBoundingClientRect().height - innerHeight)*p, behavior:'instant' }), progress);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `reports/qa/mobile-${name}.png` });
  }
  const hero = page.locator('.hero-scene');
  const photoAt = async (progress: number) => { await hero.evaluate((e,p)=>window.scrollTo({ top: e.getBoundingClientRect().top+scrollY+(e.clientHeight-innerHeight)*p, behavior:'instant' }),progress); await page.waitForTimeout(150); return page.locator('.hero-expanding-image').evaluate(e=>({ width:e.getBoundingClientRect().width, src:e.querySelector('img')?.currentSrc })); };
  const small = await photoAt(0); const full = await photoAt(.8); const reversed = await photoAt(0);
  assert.ok(full.width > small.width + 50); assert.equal(full.src,small.src); assert.ok(Math.abs(reversed.width-small.width)<2); report.heroExpansion={small,full,reversed};
  const trigger = page.locator('#preparacao .discovery-link');
  await trigger.scrollIntoViewIfNeeded(); await trigger.tap();
  await page.waitForTimeout(300);
  assert.equal(await page.getByRole('dialog').count(),1);
  await page.getByRole('button',{name:'Próxima foto'}).tap();
  await page.screenshot({path:'reports/qa/mobile-lightbox.png'});
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  // Traverse every chapter using native touch scroll gestures, with no scroll interception.
  let lastY = -1;
  const touchSamples: number[] = [];
  for(let i=0;i<55;i++) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:700}]});
    for(let y=650;y>=100;y-=50){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y}]}); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await page.waitForTimeout(70);
    const y=await page.evaluate(()=>scrollY);touchSamples.push(y); if(y===lastY)break;lastY=y;
  }
  report.touchScroll={samples:touchSamples.length,lastY:touchSamples.at(-1),positions:touchSamples};
  await page.locator('#lembrancas').scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  await writeFile('reports/qa/results.json',JSON.stringify(report,null,2));
  const a11y = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  report.accessibility = a11y.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  await page.getByRole('button',{name:'Escrever para o casal'}).tap(); await page.waitForTimeout(450);
  await page.screenshot({path:'reports/qa/mobile-guestbook-form.png'});
  const dialogA11y = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  report.dialogAccessibility=dialogA11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
  await page.getByRole('button',{name:'Fechar formulário'}).tap();
  const responsive=[];
  for(const width of [320,375,390,430,768,1024,1440]) {
    await page.setViewportSize({width,height:width>=768?960:844});
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(180);
    const size=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));
    responsive.push(size);
    await page.screenshot({path:`reports/qa/entry-${width}.png`});
    if(width===1440) {await page.locator('.preparation').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:'instant'})); await page.waitForTimeout(800); await page.screenshot({path:'reports/qa/desktop-preparation.png'});}
  }
  report.responsive=responsive;
  // Reproduce a photo-width change without resizing its track or viewport.
  const encounterWidths = await page.addStyleTag({content:'.encounter-photo { flex-basis:100%; }'});
  await page.waitForTimeout(180);
  await encounterWidths.evaluate(e=>e.parentNode?.removeChild(e));
  await page.waitForTimeout(180);
  const encounterEnd = async (pastEnd: number) => {
    await page.locator('.portal-scene').evaluate((e,offset)=>scrollTo({top:e.getBoundingClientRect().top+scrollY+e.clientHeight-innerHeight+offset,behavior:'instant'}),pastEnd);
    await page.waitForTimeout(180);
    return page.locator('.encounter-panel').last().evaluate(e=>({right:e.getBoundingClientRect().right,top:e.getBoundingClientRect().top,viewport:innerWidth}));
  };
  const lastPhoto = await encounterEnd(0);
  const verticalContinuation = await encounterEnd(160);
  assert.ok(Math.abs(lastPhoto.right-lastPhoto.viewport)<2,'The horizontal sequence must end at the last photo, without an empty tail.');
  assert.ok(Math.abs(verticalContinuation.right-verticalContinuation.viewport)<2);
  assert.ok(Math.abs(verticalContinuation.top+160)<2,'The last photo must leave vertically as soon as horizontal travel ends.');
  report.encounterEnd={lastPhoto,verticalContinuation};
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('.hero-scene').scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  report.reducedMotion=await page.locator('.hero-expanding-image').evaluate(e=>({width:e.getBoundingClientRect().width,transform:getComputedStyle(e).transform}));
  await page.screenshot({path:'reports/qa/mobile-reduced-yes.png'});
  report.errors=errors; assert.equal(errors.length,0); assert.equal(a11y.violations.length,0); assert.equal(dialogA11y.violations.length,0); assert.ok(touchSamples.at(-1)!>15000); assert.ok(responsive.every(s=>s.width===s.document));
  await writeFile('reports/qa/results.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  await browser.close();
}
main().catch(e=>{console.error(e);process.exitCode=1});




