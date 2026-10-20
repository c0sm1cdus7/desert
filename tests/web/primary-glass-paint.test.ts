import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

// Independent visual contract: visible backdrop transmission must coexist with
// normal-text contrast, including bright imagery and actual interaction states.
test('primary glass transmits its backdrop without sacrificing white-label contrast', async t => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    for (const theme of ['light', 'dark'] as const) {
      await page.setViewportSize({ width: 390, height: 740 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(f.origin); await settle(page);
      const button = page.getByRole('button', { name: 'Learn More', exact: true });
      const label = button.locator('[data-button-content]');
      // Put the actual compiled, interactive button over controlled backdrops
      // in this isolated test. No hero scrim may soften the white worst case.
      await button.evaluate(e => {
        const host = document.createElement('div'); host.dataset.testPrimaryBackdrop = '';
        Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '9999', display: 'grid', placeItems: 'center' });
        document.body.append(host); host.append(e);
      });
      const samples: Record<string, number[]> = {};
      for (const background of ['white', 'black']) {
        await page.locator('[data-test-primary-backdrop]').evaluate((e, color) => e.style.background = color, background);
        for (const state of ['idle', 'hover', 'focus', 'pressed']) {
          await page.mouse.move(0, 730); await button.evaluate(e => e.blur());
          if (state === 'hover' || state === 'pressed') await button.hover();
          if (state === 'focus') { await page.keyboard.press('Tab'); await button.focus(); }
          if (state === 'pressed') await page.mouse.down();
          await settle(page);
          const rect = (await label.boundingBox())!;
          const color = await button.evaluate(e => getComputedStyle(e).color);
          assert.equal(color, 'rgb(255, 255, 255)');
          if (state === 'focus') assert.ok(await button.evaluate(e => e.matches(':focus-visible')));
          if (state === 'pressed') assert.ok(await button.getAttribute('data-pressed') !== null);
          await label.evaluate(e => e.style.visibility = 'hidden');
          const shot = await page.screenshot();
          await label.evaluate(e => e.style.removeProperty('visibility'));
          const paint = await page.evaluate(async ({ encoded, rect }) => {
            const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
            const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
            const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
            const p = ctx.getImageData(0, 0, canvas.width, canvas.height).data, density = canvas.width / innerWidth;
            let minimumContrast = Infinity, count = 0; const mean = [0, 0, 0];
            for (let y = Math.ceil((rect.y + 2) * density); y < (rect.y + rect.height - 2) * density; y++) {
              for (let x = Math.ceil((rect.x + 2) * density); x < (rect.x + rect.width - 2) * density; x++) {
                const i = (y * canvas.width + x) * 4, rgb = [p[i]!, p[i + 1]!, p[i + 2]!];
                const linear = rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
                const luminance = .2126 * linear[0]! + .7152 * linear[1]! + .0722 * linear[2]!;
                minimumContrast = Math.min(minimumContrast, 1.05 / (luminance + .05));
                rgb.forEach((v, index) => mean[index]! += v); count++;
              }
            }
            return { minimumContrast, mean: mean.map(v => v / count) };
          }, { encoded: shot.toString('base64'), rect });
          assert.ok(paint.minimumContrast >= 4.5, `${theme}/${background}/${state}: contrast ${paint.minimumContrast}`);
          t.diagnostic(`${theme}/${background}/${state}: minimum contrast ${paint.minimumContrast.toFixed(2)}:1`);
          samples[`${background}/${state}`] = paint.mean;
          if (state === 'pressed') { await page.mouse.move(0, 730); await page.mouse.up(); }
        }
      }
      for (const state of ['idle', 'hover', 'focus', 'pressed']) {
        const difference = samples[`white/${state}`]!.map((v, i) => Math.abs(v - samples[`black/${state}`]![i]!));
        const transmission = difference.reduce((a, b) => a + b) / 3;
        assert.ok(transmission >= 45, `${theme}/${state}: backdrop change only ${transmission}/255; material reads opaque`);
        t.diagnostic(`${theme}/${state}: backdrop transmission ${transmission.toFixed(2)}/255`);
      }
    }
  } finally { await f.close(); }
});
