import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Paint acceptance, independent of the chosen material implementation:
// nested overflow at a viewport edge must not leave crisp text strokes through
// a full-area blur. No mutation to the underlying page is allowed to fix it.
test('search material filters clipped card labels at standard and dense raster scales', async () => {
  const browser = await chromium.launch({ headless: true });
  const css = await readFile(new URL('../../src/svelte/catalog/mechanisms/catalog-search/catalog-search.css', import.meta.url), 'utf8');
  try {
    for (const density of [1, 1.25, 1.5, 2, 3, 4]) for (const appearance of ['light', 'dark'] as const) {
      const page = await browser.newPage({ viewport: { width: 390, height: 250 }, deviceScaleFactor: density, colorScheme: appearance });
      await page.setContent(`<style>
        html,body{margin:0;background:#222;--background:${appearance === 'dark' ? '#1e1e1e' : '#fafafa'}}
        main{height:250px;overflow:auto;position:relative;z-index:0}
        section{display:flex;width:390px;overflow:auto}
        article{height:160px;width:224px;flex-shrink:0;background:#387190;margin:14px;position:relative;overflow:hidden;border-radius:16px}
        span{position:absolute;bottom:10px;width:100%;text-align:center;color:white;font:bold 24px Arial;z-index:1}
      </style><main><section><article><span>Sahara Desert</span></article><article><span>Serengeti</span></article></section></main>
      <aside data-catalog-search-material data-active="true"></aside>`);
      const retained = await page.locator('main').evaluate(element => ({ html: element.outerHTML, rect: element.getBoundingClientRect().toJSON(), style: getComputedStyle(element).cssText }));
      await page.addStyleTag({ content: css });
      const painted = await page.screenshot();
      const gradient = await page.evaluate(async ({ encoded, density }) => {
        const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let maximum = 0;
        for (let y = Math.ceil(130 * density); y < 165 * density; y++) {
          for (let x = Math.ceil(342 * density); x < 388 * density; x++) {
            const offset = (y * canvas.width + x) * 4;
            maximum = Math.max(maximum, Math.abs(pixels[offset]! - pixels[offset + 4]!));
          }
        }
        return maximum;
      }, { encoded: painted.toString('base64'), density });
      assert.ok(gradient <= 3, `${appearance} at ${density}dppx retains a sharp stroke: adjacent red-channel jump ${gradient}/255`);
      assert.deepEqual(await page.locator('main').evaluate(element => ({ html: element.outerHTML, rect: element.getBoundingClientRect().toJSON(), style: getComputedStyle(element).cssText })), retained);
      assert.deepEqual(await page.locator('[data-catalog-search-material]').boundingBox(), { x: 0, y: 0, width: 390, height: 250 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
      await page.close();
    }
  } finally { await browser.close(); }
});
