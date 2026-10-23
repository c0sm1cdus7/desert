import assert from "node:assert/strict";
import test from "node:test";
import type { Locator, Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  let clicks = $state(0);
</script>
<Sidebar.Provider>
  <Sidebar.Root collapsible="none">
    <Sidebar.Content><Sidebar.Group><Sidebar.Menu><Sidebar.MenuItem>
      <Sidebar.MenuButton isActive={true} aria-current="page" aria-label="Custom navigation"
        onclick={event => { event.preventDefault(); clicks++; }}>
        {#snippet child({ props })}<a {...props} href="#destination"><span>Custom navigation with a deliberately long destination label</span></a>{/snippet}
      </Sidebar.MenuButton>
    </Sidebar.MenuItem></Sidebar.Menu></Sidebar.Group></Sidebar.Content>
  </Sidebar.Root>
  <output data-clicks>{clicks}</output>
</Sidebar.Provider>`;
const paint = (control: Locator) => control.evaluate(element => {
  const s = getComputedStyle(element);
  return { overlay: s.backgroundImage, background: s.backgroundColor, transform: s.transform,
    ink:s.color, contentScale:new DOMMatrix(getComputedStyle(element.firstElementChild!).transform).a,
    pressed: element.getAttribute("data-pressed"), focus: element.matches(":focus-visible"),
    outline: s.outlineStyle, outlineWidth: s.outlineWidth, box: element.getBoundingClientRect().toJSON() };
});
const settle = (page: Page) => page.evaluate(async () => {
  await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
});

test("custom raw sidebar link inherits shared feedback without losing native semantics or caller events", async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() }); await settle(f.page);
    const link = f.page.getByRole("link", { name: "Custom navigation", exact: true });
    await link.waitFor();
    assert.equal(await link.getAttribute("href"), "#destination");
    assert.equal(await link.getAttribute("aria-current"), "page");
    assert.equal(await link.locator("[data-button-content]").count(), 0, "Custom markup is not silently replaced with Button");
    const label = await link.locator("span").evaluate(element => {
      const s = getComputedStyle(element);
      return { overflow: s.overflowX, ellipsis: s.textOverflow, whitespace: s.whiteSpace };
    });
    assert.deepEqual(label, { overflow: "hidden", ellipsis: "ellipsis", whitespace: "nowrap" }, "Raw custom labels retain MenuButton truncation");
    await f.page.mouse.move(900, 700); await settle(f.page); const normal = await paint(link);
    await link.hover(); await settle(f.page); const hover = await paint(link);
    await f.page.mouse.down(); await settle(f.page); const held = await paint(link);
    await f.page.mouse.move(900, 700); await settle(f.page); const cancelled = await paint(link);
    await f.page.mouse.up();
    assert.equal(hover.overlay, normal.overlay); assert.equal(held.overlay, hover.overlay);
    assert.ok(Math.abs(held.contentScale-.96)<.001,'raw child content shares the approved press scale');
    assert.equal(cancelled.contentScale,1,'pointer departure restores child content');
    assert.equal(held.pressed, "pointer"); assert.equal(cancelled.pressed, null);
    assert.equal(cancelled.overlay, normal.overlay);
    for (const state of [hover, held, cancelled]) {
      assert.deepEqual(state.box, normal.box); assert.equal(state.background, normal.background);
      assert.equal(state.transform, "none");
    }
    assert.equal(await f.page.locator("[data-clicks]").textContent(), "0", "Cancelled pointer never activates caller action");
    await f.page.keyboard.press("Tab"); await link.focus(); const focused = await paint(link);
    assert.equal(focused.focus, true); assert.equal(focused.outline, "solid"); assert.equal(focused.outlineWidth, "2px");
    await f.page.keyboard.down("Enter"); const keyboardHeld = await paint(link);
    assert.equal(keyboardHeld.pressed, "keyboard"); assert.equal(keyboardHeld.overlay, focused.overlay);
    await f.page.keyboard.up("Enter"); assert.equal((await paint(link)).pressed, null);
    assert.equal(await f.page.locator("[data-clicks]").textContent(), "1", "Native Enter invokes the preserved caller action once");
    assert.equal(await f.page.evaluate(() => location.hash), "", "Caller preventDefault remains authoritative");
    assert.deepEqual(f.errors, []);
  } finally { await f.page.mouse.up().catch(() => {}); await f.page.keyboard.up("Enter").catch(() => {}); await f.close(); }
});
