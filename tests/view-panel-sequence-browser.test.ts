import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { settleMotion } from "./web/fixture.ts";
import { panelSequenceFixture } from "./fixtures/panel-sequence.ts";
import { surfaceFrameBeforeViewBody } from "./fixtures/surface-frame-before-view-body.ts";

test("authored panel sequence renders in order and keeps draft, native submit, focus and instance ownership", async () => {
  const fixture = await svelteBrowser(panelSequenceFixture("form", true));
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1600, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addStyleTag({ content: await rendererCss() });
    await page.getByRole("button", { name: "Open fixture" }).click();
    const pane = page.locator(".drawer");
    await pane.waitFor(); await settleMotion(page);
    await pane.getByText("Before the bound content.", { exact: true }).waitFor();
    const text = await pane.locator('[data-surface-slot="content"]').innerText();
    assert.ok(text.indexOf("Before") < text.indexOf("Details") && text.indexOf("Details") < text.indexOf("After"));
    const input = pane.getByRole("textbox", { name: "Title", exact: true });
    const handle = await input.elementHandle(), host = await pane.elementHandle(), oldForm = await pane.locator("form").elementHandle();
    await input.fill("Keep this draft");
    await input.press("Enter");
    assert.equal(await page.locator("[data-accepted]").textContent(), "1");
    assert.equal(await page.locator("[data-writing]").textContent(), "Keep this draft");
    await input.evaluate((node: HTMLInputElement) => { node.focus(); node.setSelectionRange(5, 9); });
    for (const [width, edge, presentation] of [[390, "bottom", "transient"], [1280, "right", "transient"], [1600, "right", "docked"]]) {
      await page.setViewportSize({ width: Number(width), height: 844 });
      await page.waitForFunction(([edge, presentation]) => {
        const pane = document.querySelector(".drawer");
        return pane?.getAttribute("data-edge") === edge && pane?.getAttribute("data-presentation") === presentation;
      }, [edge, presentation]);
      assert.equal(await host!.evaluate(node => node === document.querySelector(".drawer")), true);
      assert.equal(await handle!.evaluate(node => node.isConnected && node === document.activeElement), true);
      assert.deepEqual(await input.evaluate((node: HTMLInputElement) => [node.selectionStart, node.selectionEnd]), [5, 9]);
    }
    await pane.getByRole("button", { name: "Close", exact: true }).first().click();
    await pane.waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Open fixture" }).click();
    await pane.waitFor(); await settleMotion(page);
    await handle!.evaluate((node: HTMLInputElement) => { node.value = "Stale writing"; node.dispatchEvent(new FocusEvent("blur")); });
    await oldForm!.evaluate(node => node.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    assert.equal(await input.inputValue(), "Keep this draft");
    assert.equal(await page.locator("[data-rejected]").textContent(), "2");
    assert.equal(await page.locator("[data-accepted]").textContent(), "1");
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

for (const width of [390, 1280]) for (const kind of ["form", "context"] as const) {
  test(`default ${kind} panel retains exact DOM and pixels at ${width}px`, async () => {
    const captures: Buffer[] = [], structures: string[] = [];
    for (const before of [true, false]) {
      const overrides = before ? { [resolve(import.meta.dirname, "../src/svelte/SurfaceFrame.svelte")]: surfaceFrameBeforeViewBody } : {};
      const fixture = await svelteBrowser(panelSequenceFixture(kind, false), overrides);
      try {
        const { page } = fixture;
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
        await page.addStyleTag({ content: await rendererCss() });
        await page.getByRole("button", { name: "Open fixture" }).click();
        await page.locator(".drawer").waitFor(); await settleMotion(page);
        await page.evaluate(async () => { await document.fonts.ready; });
        captures.push(await page.screenshot());
        structures.push(await page.locator('[data-surface-slot="content"]').evaluate(node => {
          const ids = new Map<string,string>();
          return node.innerHTML.replace(/<!--[^]*?-->/g, "").replace(/>\s+</g, '><').trim()
            .replace(/\b(?:bits-)?c\d+\b/g, id => {
              if (!ids.has(id)) ids.set(id, `fixture-id-${ids.size}`);
              return ids.get(id)!;
            });
        }));
        assert.deepEqual(fixture.errors, []);
      } finally { await fixture.close(); }
    }
    assert.deepEqual(structures[1], structures[0]);
    assert.ok(captures[1]!.equals(captures[0]!), 'default panel preserves exact viewport pixels');
  });
}
