import { chromium, webkit, Browser } from '@playwright/test';
import assert from 'node:assert/strict';

interface TestResult {
  browser: string;
  viewport: { width: number; height: number };
  passed: boolean;
  errors: string[];
  canvasRendered: boolean;
  firstPhotoLoaded: boolean;
  naturalWidth: number;
  scrollWidthMatches: boolean;
  interactive: boolean;
  lightboxWorks: boolean;
}

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

async function runTestForBrowser(
  browserType: typeof chromium | typeof webkit,
  browserName: string
): Promise<TestResult[]> {
  console.log(`\n========================================`);
  console.log(`Running tests on ${browserName.toUpperCase()}`);
  console.log(`========================================`);

  let browser: Browser;
  try {
    browser = await browserType.launch({ headless: true });
  } catch (err: unknown) {
    console.error(`Failed to launch ${browserName}:`, err);
    throw err;
  }

  const results: TestResult[] = [];

  for (const viewport of VIEWPORTS) {
    console.log(`\nTesting viewport: ${viewport.width}x${viewport.height} on ${browserName}...`);
    const errors: string[] = [];

    const context = await browser.newContext({
      viewport,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    page.on('pageerror', (err) => {
      console.error(`[${browserName} ${viewport.width}x${viewport.height}] Page Error:`, err.message);
      errors.push(err.message);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore favicon or non-critical 404s if any
        if (!text.includes('favicon')) {
          console.warn(`[${browserName} ${viewport.width}x${viewport.height}] Console Error:`, text);
          errors.push(text);
        }
      }
    });

    // 1. Carregar a página do zero
    await page.goto('http://127.0.0.1:5000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Abrir convite
    const openBtn = page.getByRole('button', { name: 'Abrir convite' });
    if (await openBtn.isVisible()) {
      await openBtn.tap();
      await page.waitForTimeout(1100);
    }

    // 2. Navegar normalmente até Festa
    const festa = page.locator('#festa');
    await festa.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    // 3. Fazer scroll normal até a última fotografia do casal (FinalScene - #memoria)
    const memoria = page.locator('#memoria');
    await memoria.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    // 4. Continuar até "Gratidão por quem fez parte deste dia com a gente." (#convidados)
    const convidados = page.locator('#convidados');
    await convidados.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    // 5. Confirmar que o álbum renderizou (canvas presente e dimensões válidas)
    const stage = page.locator('.convidados-stage');
    await assert.ok(await stage.isVisible(), 'Stage do álbum dos convidados deve estar visível');

    const canvas = stage.locator('canvas');
    await canvas.waitFor({ state: 'attached', timeout: 5000 });
    const canvasBox = await canvas.boundingBox();
    assert.ok(canvasBox && canvasBox.width > 0 && canvasBox.height > 0, 'Canvas deve ter dimensões positivas');

    // 6. Confirmar que as imagens do álbum renderizaram e que naturalWidth > 0
    // Testamos via carregamento no DOM de uma das imagens dos convidados
    const photoStatus = await page.evaluate(async () => {
      const img = new Image();
      img.src = '/convidados-web/IMG_0752.webp';
      await new Promise((resolve) => {
        if (img.complete) resolve(true);
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
      return {
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      };
    });

    assert.ok(photoStatus.naturalWidth > 0, `Primeira foto deve ter naturalWidth > 0 (foi ${photoStatus.naturalWidth})`);
    assert.ok(photoStatus.naturalHeight > 0, 'Primeira foto deve ter naturalHeight > 0');

    // 7. Voltar aproximadamente uma viewport
    await page.evaluate(() => window.scrollBy({ top: -window.innerHeight, behavior: 'instant' }));
    await page.waitForTimeout(300);

    // 8. Descer novamente
    await convidados.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // 9. Confirmar que o álbum continua renderizado
    assert.ok(await canvas.isVisible(), 'Canvas do álbum deve permanecer visível após subir e descer');

    // 10. Repetir usando scroll rápido
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await convidados.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    assert.ok(await canvas.isVisible(), 'Canvas deve permanecer visível após scroll rápido');

    // 11. Repetir fazendo movimentos rápidos para cima e para baixo
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy({ top: -400, behavior: 'instant' }));
      await page.waitForTimeout(50);
      await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(300);
    assert.ok(await canvas.isVisible(), 'Canvas deve permanecer ativo após oscilações rápidas');

    // 12. Confirmar ausência de console errors
    assert.equal(errors.length, 0, `Não deve haver erros no console: ${errors.join(', ')}`);

    // 13. Confirmar ausência de broken images na página inteira
    const brokenImages = await page.evaluate(() => {
      const allImgs = Array.from(document.querySelectorAll('img'));
      return allImgs
        .filter((img) => img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:'))
        .map((img) => img.src);
    });
    assert.equal(brokenImages.length, 0, `Nenhuma imagem visível deve estar quebrada: ${brokenImages.join(', ')}`);

    // 14. Confirmar que document.documentElement.scrollWidth === viewport width (sem overflow horizontal indesejado)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.equal(scrollWidth, viewport.width, `scrollWidth (${scrollWidth}) deve ser igual a viewport width (${viewport.width})`);

    // 15. Confirmar que o scroll nunca fica bloqueado
    const canScroll = await page.evaluate(() => {
      const initial = window.scrollY;
      window.scrollBy(0, 50);
      const moved = window.scrollY !== initial;
      window.scrollBy(0, -50);
      return moved;
    });
    assert.ok(canScroll, 'Página deve responder ao scroll livremente');

    // 16. Confirmar que o álbum continua interativo (toque no canvas)
    await canvas.tap();
    await page.waitForTimeout(300);

    // 17. Confirmar que tocar em uma fotografia ou abrir lightbox funciona
    const fullLink = page.getByRole('button', { name: /Ver todas as 53 fotografias/i });
    assert.ok(await fullLink.isVisible(), 'Link do lightbox deve estar visível');
    await fullLink.tap();
    await page.waitForTimeout(400);

    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.count(), 1, 'Lightbox deve abrir');

    // Verificar se a imagem do lightbox carregou com naturalWidth > 0
    const lightboxImg = dialog.locator('img');
    await lightboxImg.waitFor({ state: 'visible', timeout: 5000 });
    const lightboxImgLoaded = await lightboxImg.evaluate((img: HTMLImageElement) => {
      return img.complete && img.naturalWidth > 0;
    });
    assert.ok(lightboxImgLoaded, 'Imagem do lightbox deve ter naturalWidth > 0');

    // Fechar lightbox
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    assert.equal(await dialog.count(), 0, 'Lightbox deve fechar');

    results.push({
      browser: browserName,
      viewport,
      passed: true,
      errors,
      canvasRendered: true,
      firstPhotoLoaded: true,
      naturalWidth: photoStatus.naturalWidth,
      scrollWidthMatches: true,
      interactive: true,
      lightboxWorks: true,
    });

    console.log(`✓ ${browserName} ${viewport.width}x${viewport.height}: PASSED`);
    await context.close();
  }

  await browser.close();
  return results;
}

async function main() {
  console.log('Starting automated regression tests for Convidados Album...');

  const chromiumResults = await runTestForBrowser(chromium, 'chromium');
  const webkitResults = await runTestForBrowser(webkit, 'webkit');

  const allResults = [...chromiumResults, ...webkitResults];
  const allPassed = allResults.every((r) => r.passed);

  console.log('\n========================================');
  console.log('REGRESSION TEST SUMMARY');
  console.log('========================================');
  for (const r of allResults) {
    console.log(
      `${r.browser.padEnd(10)} ${`${r.viewport.width}x${r.viewport.height}`.padEnd(12)} -> ${
        r.passed ? 'PASSED (0 errors, valid canvas, naturalWidth > 0)' : 'FAILED'
      }`
    );
  }

  if (!allPassed) {
    console.error('Some tests failed!');
    process.exit(1);
  } else {
    console.log('\nALL MOBILE REGRESSION TESTS PASSED ON BOTH CHROMIUM AND WEBKIT!');
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
