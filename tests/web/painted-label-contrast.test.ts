import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { paintedLabelContrast } from './painted-label-contrast.ts';

test('pixel contrast resolves glass over nonuniform media and still rejects low contrast', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 200 }, deviceScaleFactor: 2 });
    await page.setContent(`<style>
      body{margin:0;height:200px;display:grid;place-items:center;background:linear-gradient(90deg,black,white)}
      button{width:320px;height:60px;border:0;background:rgb(0 0 0/.1);backdrop-filter:blur(8px);color:white;font:17px Arial}
      span{display:block;width:100%}
    </style><button><span data-button-content>Visible label</span></button>`);
    const button = page.locator('button');
    const low = await paintedLabelContrast(page, button);
    assert.ok(low.ratio < 4.5, 'The bright part of the glass backdrop must fail');
    assert.ok(low.samples > 1000, 'Measurement covers a region, not a convenient single pixel');
    await button.evaluate(e => e.style.background = 'rgb(0 0 0/.85)');
    const supported = await paintedLabelContrast(page, button);
    assert.ok(supported.ratio >= 4.5, 'Sufficient dark support must resolve the same nonuniform backdrop');
    assert.equal(await button.locator('span').evaluate(e => e.style.visibility), '', 'Restore label paint after sampling');
    await button.evaluate(e => e.style.opacity = '.5');
    await assert.rejects(paintedLabelContrast(page, button), /Foreground attenuation/);
  } finally { await browser.close(); }
});
