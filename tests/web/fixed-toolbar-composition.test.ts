import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { svelteBrowser } from '../fixtures/svelte-browser.ts';
import { rendererCss } from '../fixtures/renderer-css.ts';
import { settle } from './public-catalog-expectations.ts';

// Replaces the removed expansion API test. The owner's v107 contract requires
// independent scroll content and ordinary top/bottom instances of one toolbar.
test('fixed toolbar composition preserves content layout and action identity through scroll and resize', async () => {
  const f = await svelteBrowser(`<script>
    import Place from '@desert/svelte/catalog/foundations/place/Place.svelte';
    import PlaceHeading from '@desert/svelte/catalog/compositions/place-heading/PlaceHeading.svelte';
    import ToolbarLayout from '@desert/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte';
    let identity={title:'A deliberately descriptive place title',subtitle:'Supporting copy belongs to the page.'};
  </script>
  <div style="height:568px;position:relative">
    <Place>
      {#snippet top()}<ToolbarLayout content={{kind:'actions',actions:[{intent:{kind:'back'},icon:'back',label:'Back',state:'ready'}],onevent:()=>{}}}/>{/snippet}
      {#snippet content()}<PlaceHeading {identity}/><div style="height:2400px">Content</div>{/snippet}
      {#snippet bottom()}<ToolbarLayout edge="bottom" content={{kind:'actions',actions:[{intent:{kind:'journey',journey:'search'},icon:'search',label:'Search',state:'ready'}],onevent:()=>{}}}/>{/snippet}
    </Place>
  </div>`);
  const { page } = f;
  try {
    await page.addStyleTag({ content: await rendererCss() });
    const viewport = page.locator('.place-viewport'), title = page.getByRole('heading', { level: 1 });
    const search = page.getByRole('button', { name: 'Search', exact: true });
    const titleNode = await title.elementHandle(), searchNode = await search.elementHandle();
    const measure = () => page.locator('[data-place]').evaluate(owner => {
      const viewport = owner.querySelector('.place-viewport')!, title = owner.querySelector('h1')!;
      const range = document.createRange(); range.selectNodeContents(title);
      return { scrollHeight: viewport.scrollHeight, scrollTop: viewport.scrollTop,
        titleY: title.getBoundingClientRect().y, lines: range.getClientRects().length, font: getComputedStyle(title).fontSize,
        bars: [...owner.querySelectorAll('[data-toolbar]')].map(bar => ({ edge: bar.getAttribute('data-toolbar'), y: bar.getBoundingClientRect().y, height: bar.getBoundingClientRect().height })) };
    });
    for (const width of [320, 390, 1280]) for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 568 });
      await page.evaluate(value => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
      await viewport.evaluate(node => node.scrollTop = 0); await settle(page);
      // Native keyboard establishes focus, not an imperative .focus() setup.
      await search.click(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
      assert.ok(await search.evaluate(node => node === document.activeElement));
      const before = await measure();
      for (const scroll of [20, 100, 500, 100, 0]) {
        await viewport.evaluate((node, value) => node.scrollTop = value, scroll); await settle(page);
        const after = await measure();
        assert.deepEqual(after.bars, before.bars, 'Neither toolbar changes geometry with document scroll');
        assert.deepEqual([after.scrollHeight, after.lines, after.font], [before.scrollHeight, before.lines, before.font]);
        assert.ok(Math.abs(before.titleY - after.titleY - after.scrollTop) < 1, 'Heading moves only with document scroll');
        assert.ok(await title.evaluate((node, original) => node === original, titleNode));
        assert.ok(await search.evaluate((node, original) => node === original && node === document.activeElement, searchNode));
      }
      assert.ok(before.bars.reduce((sum, bar) => sum + bar.height, 0) <= 568 * .45, 'Fixed chrome preserves most of a short viewport');
      assert.equal(await page.locator('[data-toolbar] h1,[data-toolbar] [data-place-primary]').count(), 0);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test('source composition has one ordinary ToolbarLayout and no expansion delegation', async () => {
  const load = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
  const [layout, heading, embeddedHeading, workspace, search, toolbar] = await Promise.all([
    load('src/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte'), load('src/svelte/catalog/compositions/place-heading/PlaceHeading.svelte'),
    load('src/svelte/catalog/compositions/place-header/PlaceHeader.svelte'), load('src/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte'),
    load('src/svelte/catalog/compositions/catalog-workspace/CatalogToolbar.svelte'), load('src/svelte/catalog/compositions/toolbar/Toolbar.svelte'),
  ]);
  assert.doesNotMatch(layout, /ExpandingToolbar|toolbar-geometry|expansion\s*[,?:=]/);
  assert.match(layout, /data-toolbar=\{edge\}/, 'Both directions are instances of the same primitive');
  for (const source of [heading, embeddedHeading]) assert.doesNotMatch(source, /ToolbarLayout|ExpandingToolbar/);
  assert.match(workspace, /<ToolbarLayout\b/); assert.match(search, /<ToolbarLayout\b/);
  assert.match(toolbar, /<ToolbarLayout content=\{\{kind:"commands",toolbar,/, 'Task footers delegate their typed edge to the same owner');
  assert.match(layout, /toolbar\?\.edge \?\?/, 'The shared owner derives the edge from the command toolbar');
});
