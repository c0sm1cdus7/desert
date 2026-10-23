import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { groupedRowsSource } from "./fixtures/grouped-rows.ts";

test("grouped lists retain one visible pane on a card, with an opaque accessibility fallback", async () => {
  const f = await svelteBrowser(groupedRowsSource);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.addStyleTag({ content: 'section { background:var(--card); padding:16px; }' });
    for (const theme of ["light", "dark"]) {
      await f.page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      for (const family of ["collection", "actions", "options", "checks", "selection"]) {
        const panel = f.page.locator(`[data-test="${family}"] [data-grouped-panel]`);
        const material = await panel.evaluate(element => {
          const style = getComputedStyle(element);
          return { fill: style.backgroundColor, parent: getComputedStyle(element.closest('section')!).backgroundColor,
            border: style.borderTopWidth, blur: style.backdropFilter, count: element.querySelectorAll('[data-grouped-panel]').length };
        });
        assert.notEqual(material.fill, material.parent, `${theme}/${family}: pane must not disappear into its containing card`);
        assert.equal(material.border, "1px");
        assert.match(material.blur, /blur\(/);
        assert.equal(material.count, 0, "one material for the list, not a pane per row");
      }
    }
    for (const preference of ["prefers-reduced-transparency", "prefers-contrast"]) {
      const session = await f.page.context().newCDPSession(f.page);
      await session.send("Emulation.setEmulatedMedia", { features: [{ name: preference, value: preference === "prefers-contrast" ? "more" : "reduce" }] });
      const material = await f.page.locator('[data-test="options"] [data-grouped-panel]').evaluate(element => {
        const style = getComputedStyle(element);
        const canvas = document.createElement('canvas').getContext('2d')!;
        canvas.fillStyle = style.backgroundColor; canvas.fillRect(0, 0, 1, 1);
        return { blur: style.backdropFilter, alpha: canvas.getImageData(0, 0, 1, 1).data[3], border: style.borderTopWidth };
      });
      assert.equal(material.blur, "none");
      assert.equal(material.alpha, 255, "opaque fill regardless of browser color serialization");
      assert.equal(material.border, "1px", "group boundary survives opaque fallback");
      await session.detach();
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
