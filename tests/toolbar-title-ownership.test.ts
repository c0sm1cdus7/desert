import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { toolbarReadingGuideSource } from "./fixtures/toolbar-reading-guide.ts";

for (const [width, textScale] of [[1280, 1], [390, 1], [1920, 2]] as const) {
  test(`navigation title shares its content guide at ${width}px and ${textScale * 100}% text`, async () => {
    const f = await svelteBrowser(toolbarReadingGuideSource(false), {}, "http://navigation-title.test/");
    try {
      await f.page.setViewportSize({ width, height: 900 });
      await f.page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await f.page.addStyleTag({ content: await rendererCss() });
      if (textScale === 2) await f.page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      if (width < 960) await f.page.getByRole("button", { name: "Show navigation", exact: true }).click();
      const navigation = f.page.locator("[data-catalog-navigation]");
      await navigation.waitFor({ state: "visible" });
      const title = navigation.getByText("VOID", { exact: true });
      const metrics = await title.evaluate(element => {
        const nav = element.closest("[data-catalog-navigation]")!;
        const start = (node: Element) => {
          const range = document.createRange(); range.selectNodeContents(node);
          return range.getBoundingClientRect().left;
        };
        return {
          title: start(element),
          group: start(nav.querySelector("[data-slot='sidebar-group-label']")!),
          icon: nav.querySelector("[data-navigation-icon]")!.getBoundingClientRect().left,
          titleOwner: element.closest("[data-toolbar-heading]") !== null,
        };
      });
      assert.ok(Math.abs(metrics.title - metrics.group) < .5, `title/group reading delta: ${metrics.title - metrics.group}px`);
      assert.ok(Math.abs(metrics.title - metrics.icon) < .5, `title/row reading delta: ${metrics.title - metrics.icon}px`);
      assert.equal(metrics.titleOwner, true, "navigation identity is owned by the same toolbar title component");
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}
// The gate halves (raw identity markup, identity geometry) are catalog rules E and G: tests/catalog-ported-boundaries.test.ts.
