// Modal (design §1.6): Escape, the scrim and the grip emit `dismiss` and the caller decides; a locked modal emits
// nothing; `closed` follows the exit. Every presentation shares the rule.
import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { settleMotion } from "./web/fixture.ts";

const fixture = (presentation: string, locked: boolean) => svelteBrowser(`<script>
  import Modal from '@desert/svelte/catalog/foundations/modal/Modal.svelte';
  let open = $state(false), dismissed = $state(0), closed = $state(0);
</script>
<main data-surface-host><button onclick={() => open = true}>Open</button>
  <output data-dismissed>{dismissed}</output><output data-closed>{closed}</output>
  <Modal label="Context" {open} locked={${locked}} presentation="${presentation}"
    ondismiss={() => { dismissed += 1; open = false; }} onclosed={() => closed += 1}><p>Keep the source context visible.</p></Modal>
</main>`);

for (const presentation of ["adaptive", "transient", "sheet", "message", "media", "navigation"]) {
  test(`${presentation}: Escape asks to dismiss once, the caller closes it, and closed follows`, async () => {
    const f = await fixture(presentation, false);
    try {
      await f.page.setViewportSize({ width: 390, height: 740 });
      await f.page.emulateMedia({ reducedMotion: "reduce" });
      await f.page.addStyleTag({ content: await rendererCss() });
      await f.page.getByRole("button", { name: "Open", exact: true }).click();
      const dialog = f.page.getByRole("dialog", { name: "Context", exact: true });
      await dialog.waitFor(); await settleMotion(f.page);
      assert.equal(await dialog.getAttribute("data-modal"), presentation);
      await f.page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await f.page.locator("[data-dismissed]").textContent(), "1");
      await f.page.locator("[data-closed]").filter({ hasText: "1" }).waitFor();
      assert.equal(await f.page.getByRole("button", { name: "Open", exact: true }).evaluate(element => element === document.activeElement), true,
        "focus returns to the opener");
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });

  test(`${presentation}: a locked modal refuses Escape and its scrim`, async () => {
    const f = await fixture(presentation, true);
    try {
      await f.page.setViewportSize({ width: 390, height: 740 });
      await f.page.emulateMedia({ reducedMotion: "reduce" });
      await f.page.addStyleTag({ content: await rendererCss() });
      await f.page.getByRole("button", { name: "Open", exact: true }).click();
      const dialog = f.page.getByRole("dialog", { name: "Context", exact: true });
      await dialog.waitFor(); await settleMotion(f.page);
      await f.page.keyboard.press("Escape");
      await f.page.mouse.click(2, 2);
      await settleMotion(f.page);
      assert.equal(await dialog.isVisible(), true);
      assert.equal(await f.page.locator("[data-dismissed]").textContent(), "0");
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}

test("a bottom-edge modal's grip dismisses it; the sheet keeps its close toolbar", async () => {
  const f = await fixture("sheet", false);
  try {
    await f.page.setViewportSize({ width: 390, height: 740 });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.getByRole("button", { name: "Open", exact: true }).click();
    const dialog = f.page.getByRole("dialog", { name: "Context", exact: true });
    await dialog.waitFor(); await settleMotion(f.page);
    assert.equal(await dialog.getByRole("button", { name: "Close Context", exact: true }).count(), 1);
    await dialog.getByRole("button", { name: "Close panel", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await f.page.locator("[data-dismissed]").textContent(), "1");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
