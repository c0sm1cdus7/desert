import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { toolbarReadingGuideSource } from "./fixtures/toolbar-reading-guide.ts";

for (const width of [390, 1600]) {
  test(`the real overlay toolbar receives title clicks and keyboard return at ${width}px`, async () => {
    const f = await svelteBrowser(toolbarReadingGuideSource(false));
    try {
      await f.page.setViewportSize({ width, height: 844 });
      await f.page.addStyleTag({ content: await rendererCss() });
      const viewport = f.page.locator('[data-catalog-scroll]');
      const toolbar = f.page.locator('[data-place-toolbar]');
      const title = toolbar.locator('[data-identity-title]');
      const down = async () => {
        await viewport.evaluate(element => { element.scrollTop = 800; });
        await toolbar.getByRole('button', { name: 'Back to top', exact: true }).waitFor({ state: 'attached' });
        await f.page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-toolbar-identity]')!).opacity) > .9);
      };
      const top = async () => {
        await f.page.waitForFunction(() => document.querySelector('[data-catalog-scroll]')!.scrollTop === 0);
        assert.equal(await f.page.evaluate(() => document.scrollingElement!.scrollTop), 0);
      };
      await down();
      assert.equal(await toolbar.evaluate(element => getComputedStyle(element).pointerEvents), 'auto');
      const bounds = (await title.boundingBox())!;
      const x = bounds.x + 10, y = bounds.y + bounds.height / 2;
      assert.equal(await f.page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-place-toolbar]') !== null, { x, y }), true);
      await f.page.mouse.click(x, y);
      await top();
      for (const key of ['Enter', 'Space']) {
        await down();
        await toolbar.getByRole('button', { name: 'Back to top', exact: true }).focus();
        await f.page.keyboard.press(key);
        await top();
      }
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}
