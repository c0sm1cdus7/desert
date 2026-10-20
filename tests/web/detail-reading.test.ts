import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { loadLandmarks } from '../../products/landmarks/product.ts';
import { settle } from './public-catalog-expectations.ts';

for (const width of [390, 1280]) test(`detail identity is brief and full prose stays readable at ${width}`, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width, height: 844 });
    await f.page.goto(`${f.origin}/?record=1016`); await settle(f.page);
    const header = f.page.locator('[data-place-header]');
    assert.equal((await header.innerText()).trim().replace(/\s+/g, ' '), 'Mount Fuji Asia');
    const about = f.page.locator('[data-catalog-detail] [data-place-stack="about"]');
    assert.equal(await about.getByRole('heading', { name: 'About', exact: true }).count(), 1);
    const expected = loadLandmarks().application.surface.details.find(item => item.record === '1016')!.description;
    assert.equal(await about.locator('p').textContent(), expected, 'No truncation, synopsis or omitted paragraphs');
    const metrics = await f.page.evaluate(() => {
      const copy = document.querySelector('[data-dock-above]')!.getBoundingClientRect();
      const prose = document.querySelector('[data-catalog-prose] p')!;
      return { x: prose.getBoundingClientRect().x, identity: copy.x,
        width: prose.getBoundingClientRect().width, font: parseFloat(getComputedStyle(prose).fontSize),
        overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(Math.abs(metrics.x - metrics.identity) < 1, 'Reading and identity share the same content axis');
    assert.ok(metrics.width < 700, 'Long-form reading has a bounded line length');
    assert.ok(metrics.font >= 16); assert.equal(metrics.overflow, false);
    if (width === 390) {
      await f.page.locator('[data-catalog-scroll]').evaluate(el => el.scrollTop = el.scrollHeight);
      await settle(f.page);
      assert.equal(await header.getAttribute('data-handoff'), 'compact', 'Full prose creates reachable, unambiguous handoff');
    }
  } finally { await f.close(); }
});

test('brief detail identity and full prose remain reachable at 320px and 200% text', async () => {
  const f=await publicCatalogFixture();
  try {
    const directory='artifacts/ui-maturity-v118/detail-reading';
    await mkdir(directory,{recursive:true});
    for(const colorScheme of ['light','dark'] as const) for(const [width,scale] of [[320,1],[320,2],[1280,2]] as const) {
      await f.page.emulateMedia({colorScheme,reducedMotion:'reduce'});
      await f.page.setViewportSize({width,height:900});
      await f.page.goto(`${f.origin}/?record=1016`);
      await f.page.evaluate(scale=>document.documentElement.style.setProperty('--text-scale',String(scale)),scale);
      await settle(f.page);
      assert.equal(await f.page.locator('[data-catalog-detail] [data-place-stack="about"] p').textContent(),
        loadLandmarks().application.surface.details.find(item=>item.record==='1016')!.description);
      assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${colorScheme}/${width}/${scale}: viewport overflow`);
      await f.page.screenshot({path:`${directory}/${colorScheme}-${width}-${scale}.png`});
      await f.page.locator('[data-catalog-scroll]').evaluate(el=>el.scrollTop=el.scrollHeight);
      await settle(f.page);
      assert.equal(await f.page.locator('[data-place-header]').getAttribute('data-handoff'),'compact');
    }
  } finally {await f.close();}
});
