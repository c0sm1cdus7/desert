import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

for (const place of ['bank', 'travel-kit']) test(`${place}: compact title uses available reading capacity without unstable word breaks`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`${f.origin}/?place=${place}`);
    await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '2'));
    await settle(page);
    const guide = await page.evaluate(place => {
      const title = document.querySelector('[data-catalog-content] > [data-place-header] [data-place-title]')!;
      const selector = place === 'bank' ? '[data-catalog-entry] > header h2' : '.place-stack-title h2';
      const caption = [...document.querySelectorAll(selector)].find(element => element.checkVisibility())!;
      return { titleX: title.getBoundingClientRect().left, captionX: caption.getBoundingClientRect().left,
        caption: caption.textContent, scale: getComputedStyle(document.documentElement).getPropertyValue('--text-scale') };
    }, place);
    const snapshots = [];
    for (const offset of [0, 60, 120, 240, 500, 120, 0]) {
      await page.locator('[data-catalog-scroll]').evaluate((element, value) => element.scrollTop = value, offset);
      await settle(page);
      const frames = await page.locator('[data-catalog-content] > [data-place-header]').evaluate(async header => {
        const title = header.querySelector('[data-place-title]')!;
        const frames = [];
        for (let index = 0; index < 8; index++) {
          await new Promise(requestAnimationFrame);
          const titleBounds = title.getBoundingClientRect(), headerBounds = header.getBoundingClientRect();
          const leading = [...header.querySelectorAll('button')].find(button => button.checkVisibility())!.getBoundingClientRect();
          const available = headerBounds.right - (leading.left - headerBounds.left) - titleBounds.left;
          const style = getComputedStyle(title);
          const context = document.createElement('canvas').getContext('2d')!;
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const words = [];
          const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            for (const match of node.textContent!.matchAll(/\S+/g)) {
              const range = document.createRange(); range.setStart(node, match.index!); range.setEnd(node, match.index! + match[0].length);
              words.push({ word: match[0], naturalWidth: context.measureText(match[0]).width, fragments: range.getClientRects().length });
            }
          }
          const range = document.createRange(); range.selectNodeContents(title);
          const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size;
          frames.push({ available, width: titleBounds.width, lines, words,
            naturalWidth: context.measureText(title.textContent!.trim()).width,
            condensed: header.getAttribute('data-header-condensed') === 'true' });
        }
        return frames;
      });
      snapshots.push({ offset, frames });
    }
    const directory = `artifacts/place-title-capacity/${process.env.DESERT_CATALOG_BUILD?.split('/').pop()}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/${place}.json`, JSON.stringify(snapshots, null, 2));
    await writeFile(`${directory}/${place}-guide.json`, JSON.stringify(guide, null, 2));
    assert.ok(Math.abs(guide.titleX - guide.captionX) <= 1, `Expanded title shares the caption's content guide at200%: ${JSON.stringify(guide)}`);
    const compact = snapshots.find(snapshot => snapshot.offset === 500)!.frames[0]!;
    assert.ok(compact.condensed, 'Capacity is measured at the actual completed compact presentation');
    for (const word of compact.words) if (word.naturalWidth <= compact.available + 1)
      assert.equal(word.fragments, 1, `${word.word} fits the available inline capacity and must not split mid-word`);
    if (compact.naturalWidth <= compact.available + 1) assert.equal(compact.lines, 1, 'A whole title that fits stays on one line');
    const signature = (frame: typeof compact) => JSON.stringify({ lines: frame.lines, fragments: frame.words.map(word => word.fragments) });
    for (const snapshot of snapshots)
      assert.ok(snapshot.frames.every(frame => signature(frame) === signature(snapshot.frames[0]!)), 'Settled layout cannot oscillate its word breaks');
    assert.ok(snapshots.every(snapshot => signature(snapshot.frames[0]!) === signature(compact)), 'Scroll-driven title motion preserves its line composition');
  } finally { await f.close(); }
});
