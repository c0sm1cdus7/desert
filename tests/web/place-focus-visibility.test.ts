import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

// Native keyboard movement must reveal the focused control below the actual
// floating toolbar, including its ring. Being inside the viewport is not enough.
for (const [width, scale] of [[390, 1], [320, 2]] as const) {
  test(`Place reveals keyboard focus below its measured chrome at ${width}/${scale}`, async () => {
    const f = await publicCatalogFixture();
    const samples: unknown[] = [], failures: unknown[] = [];
    const directory = `artifacts/skeptics-v105/focus/${basename(process.env.DESERT_CATALOG_BUILD ?? 'default')}`;
    try {
      await f.page.setViewportSize({ width, height: 600 });
      await f.page.goto(`${f.origin}/?place=bank`);
      await f.page.evaluate(value => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
      await settle(f.page);
      for (const key of [...Array(10).fill('Tab'), ...Array(9).fill('Shift+Tab')]) {
        await f.page.keyboard.press(key); await settle(f.page);
        // Reveal follows browser focus scrolling and toolbar geometry commits.
        await f.page.evaluate(async () => { for (let i = 0; i < 10; i++) await new Promise(requestAnimationFrame); });
        const sample = await f.page.evaluate(() => {
          const target = document.activeElement as HTMLElement;
          if (!target.closest('[data-catalog-scroll]')) return null;
          const bounds = target.getBoundingClientRect();
          const owner = target.closest('[data-scroll-owner]')!;
          const bars = [...owner.querySelectorAll<HTMLElement>('[data-toolbar]')]
            .filter(bar => bar.closest('[data-scroll-owner]') === owner && bar.checkVisibility());
          const chromeBottom = Math.max(0, ...bars.filter(bar => bar.dataset.toolbar === 'top').map(bar => bar.getBoundingClientRect().bottom));
          const chromeTop = Math.min(innerHeight, ...bars.filter(bar => bar.dataset.toolbar === 'bottom').map(bar => bar.getBoundingClientRect().top));
          const point = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + Math.min(10, bounds.height / 2));
          return { label: target.getAttribute('aria-label'), top: bounds.top, bottom: bounds.bottom,
            chromeBottom, exposed: target === point || target.contains(point),
            clear: bounds.top >= chromeBottom + 4 && bounds.bottom <= chromeTop - 4 };
        });
        if (sample) { samples.push({ key, ...sample }); if (!sample.clear || !sample.exposed) failures.push({ key, ...sample }); }
      }
      await mkdir(directory, { recursive: true });
      await writeFile(`${directory}/${width}-${scale}.json`, JSON.stringify({ samples, failures }, null, 2));
      await f.page.screenshot({ path: `${directory}/${width}-${scale}.png` });
      assert.deepEqual(failures, [], 'Keyboard focus must not disappear behind floating chrome');
      // A user may deliberately scroll away from focus: never fight their gesture.
      await f.page.locator('[data-primitive="input.text"] input').first().focus();
      await settle(f.page);
      await f.page.locator('[data-catalog-scroll]').evaluate(node => node.scrollTop = 700);
      await settle(f.page);
      const before = await f.page.locator('[data-catalog-scroll]').evaluate(node => node.scrollTop);
      await f.page.evaluate(async () => { for (let i = 0; i < 10; i++) await new Promise(requestAnimationFrame); });
      assert.equal(await f.page.locator('[data-catalog-scroll]').evaluate(node => node.scrollTop), before);
    } finally { await f.close(); }
  });
}
