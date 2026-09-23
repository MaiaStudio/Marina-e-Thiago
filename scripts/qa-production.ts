import { chromium } from '@playwright/test';
import { writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
async function main(){
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(`window.__metrics={lcp:0,cls:0,events:[]};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__metrics.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__metrics.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.interactionId)window.__metrics.events.push(e.duration)}).observe({type:'event',durationThreshold:16,buffered:true});`);
const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
const response=await page.goto('http://127.0.0.1:3001',{waitUntil:'networkidle'});await page.waitForTimeout(1000);
const first=await page.evaluate(`({...window.__metrics,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,resources:performance.getEntriesByType('resource').map(e=>({name:e.name,bytes:e.transferSize})),totalBytes:performance.getEntriesByType('resource').reduce((n,e)=>n+e.transferSize,0)})`);
await page.getByRole('button',{name:'Abrir convite'}).tap();await page.waitForTimeout(1800);
const interaction=await page.evaluate(`window.__metrics`);
const headers=response!.headers();assert.match(headers['x-robots-tag'],/noindex/);
const manifest=await context.request.get('http://127.0.0.1:3001/api/guestbook');assert.equal((await manifest.json()).mode,'unavailable');
const og=await context.request.get('http://127.0.0.1:3001/opengraph-image');assert.equal(og.status(),200);
const original=await context.request.get('http://127.0.0.1:3001/Marina%20e%20Thiago/Beijo/IMG_0590.jpg');assert.equal(original.status(),404);
const nft=JSON.parse(await readFile('.next/server/app/api/guestbook/route.js.nft.json','utf8'));
assert.ok(!nft.files.some((p:string)=>/Marina e Thiago\/|reports\/|\.data\//.test(p)));
const report={profile:{viewport:'390×844',deviceScaleFactor:2,downstreamMbps:1.6,latencyMs:150,cpuSlowdown:4},first,interaction,headers:{robots:headers['x-robots-tag']},guestbookProduction:'unavailable until configured',og:og.status(),originalFilesPublic:false,traceExcludesOriginals:true,errors};
await writeFile('reports/qa/production.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
}
main().catch(e=>{console.error(e);process.exitCode=1});
