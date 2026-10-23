import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

const source = `<script>
  import { Button } from '@desert/svelte/vendor/components/ui/button/index.js';
  import DateControl from '@desert/svelte/catalog/foundations/date-control/DateControl.svelte';
  let node = $state({version:'desert.control/1',kind:'date',id:'arrival',label:'Arrival date',
    required:false,disabled:false,value:'2026-10-15',minimum:'2026-10-01',maximum:'2026-11-30'});
</script>
<main style="padding:24px;max-width:640px">
  {#each ['default','secondary','outline','destructive'] as variant}
    <Button {variant}>{variant}</Button>
  {/each}
  <DateControl {node} onevent={event => node = {...node,value:event.value}} />
</main>`;

for (const colorScheme of ['dark', 'light'] as const) test(`shared action glass retains feedback and accessible fallback (${colorScheme})`, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.emulateMedia({ colorScheme, reducedMotion:'reduce' });
    for (const name of ['default', 'secondary', 'outline', 'destructive']) {
      const button = f.page.getByRole('button', { name, exact: true });
      const style = await button.evaluate(el => {
        const css = getComputedStyle(el);
        return { fill: css.backgroundColor, filter: css.backdropFilter, shadow: css.boxShadow,
          perimeter:css.borderTopWidth, image:css.backgroundImage };
      });
      // Approved v117 S1 supersedes the earlier action tint, shadow and hover-fill recipe.
      assert.equal(style.filter, 'blur(24px)', `${name} uses only the shared blur`);
      assert.match(style.fill, /\/\s*0\.88\b|rgba\([^)]*,\s*0\.88\)/, `${name} has the same neutral 88% fill`);
      assert.equal(style.shadow, 'none');
      assert.equal(style.perimeter, '1px');
      assert.equal(style.image, 'none');
      await button.hover();
      assert.equal(await button.evaluate(el => getComputedStyle(el).backgroundImage), 'none');
      assert.equal(await button.evaluate(el => getComputedStyle(el).backgroundColor), style.fill);
      await f.page.mouse.down();
      assert.notEqual(await button.getAttribute('data-pressed'), null);
      await f.page.mouse.up();
      await button.focus();
      await f.page.keyboard.press('Tab'); await f.page.keyboard.press('Shift+Tab');
      assert.notEqual(await button.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    }
    await f.page.emulateMedia({ colorScheme, contrast: 'more' });
    assert.equal(await f.page.getByRole('button', { name: 'secondary', exact: true }).evaluate(el => getComputedStyle(el).backdropFilter), 'none');
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

for (const width of [320, 390, 1024]) test(`date picker has one month toolbar with trailing navigation at ${width}px`, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width, height: 900 });
    await f.page.emulateMedia({ reducedMotion: 'reduce', colorScheme: width === 390 ? 'dark' : 'light' });
    const trigger = f.page.locator('[data-date-trigger]');
    await trigger.click();
    const dialog = f.page.getByRole('dialog', { name: 'Arrival date', exact: true });
    const toolbar = dialog.locator('[data-piece="toolbar"]');
    await toolbar.waitFor();
    assert.equal(await toolbar.count(), 1);
    const title = toolbar.getByRole('heading', { name: 'October 2026', exact: true });
    await title.waitFor();
    const previous = toolbar.getByRole('button', { name: 'Previous month', exact: true });
    const next = toolbar.getByRole('button', { name: 'Next month', exact: true });
    assert.equal(await previous.isDisabled(), true, 'minimum month constrains navigation');
    const heading = (await title.boundingBox())!, prev = (await previous.boundingBox())!, following = (await next.boundingBox())!;
    assert.ok(heading.x + heading.width <= prev.x && prev.x + prev.width <= following.x, 'month then both arrows on the right');
    if (width < 384) {
      const close = (await toolbar.getByRole('button', { name: 'Close Arrival date', exact: true }).boundingBox())!;
      assert.ok(close.x + close.width <= heading.x, 'shared close remains on the left');
    }
    await next.click();
    await toolbar.getByRole('heading', { name: 'November 2026', exact: true }).waitFor();
    assert.equal(await next.isDisabled(), true, 'maximum month constrains navigation');
    await previous.click();
    await toolbar.getByRole('heading', { name: 'October 2026', exact: true }).waitFor();
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await mkdir('artifacts/action-glass-calendar-toolbar', { recursive: true });
    await f.page.screenshot({ path: `artifacts/action-glass-calendar-toolbar/calendar-${width}.png` });
    if (width === 320) {
      await f.page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '2'));
      await f.page.waitForFunction(() => document.querySelector('[data-date-calendar] [data-toolbar-layout]')?.getAttribute('data-toolbar-layout') === 'stacked');
      assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'enlarged text stays inside the picker');
      assert.ok((await title.boundingBox())!.width > 200, 'enlarged title receives a complete row, not a narrow column');
      await f.page.screenshot({ path: 'artifacts/action-glass-calendar-toolbar/calendar-320-enlarged.png' });
    }
    await f.page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.ok(await trigger.evaluate(el => el === document.activeElement));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
