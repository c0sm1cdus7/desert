import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const surfaceFramePath = resolve(import.meta.dirname, "../src/svelte/catalog/compositions/surface-frame/SurfaceFrame.svelte");
const frameBody = `<FrameBody content={checked.content} {invoke} {edit} {controlEvent} messageDialog={presentation === "message"} />`;
const viewBody = `{#if body}<ContentFlow resolved={body} onevent={dispatch} host="panel" />\n    {:else}${frameBody}{/if}`;
/** Today's SurfaceFrame without its view-body branch: later chrome, such as the top-rail commit, stays in both captures. */
async function surfaceFrameWithoutViewBody() {
  const current = await readFile(surfaceFramePath, "utf8");
  assert.equal(current.split(viewBody).length, 2, "SurfaceFrame has exactly one view-body branch");
  return current.replace(viewBody, frameBody);
}

const frozenFrameInset = "[data-surface-frame]:not(.chrome-inset) { @apply chrome-inset; }";

for (const width of [390, 1280]) for (const kind of ["form", "context"] as const) {
  test(`default ${kind} panel retains exact DOM and pixels at ${width}px`, async () => {
    const captures: Buffer[] = [], contents: Buffer[] = [], structures: string[] = [];
    // The frozen pre-view-body source proves the content DOM; today's frame without the branch proves the pixels.
    for (const before of ["frozen", "without-body", "current"] as const) {
      const overrides = before === "frozen" ? { [surfaceFramePath]: surfaceFrameBeforeViewBody }
        : before === "without-body" ? { [surfaceFramePath]: await surfaceFrameWithoutViewBody() } : {};
      const fixture = await svelteBrowser(panelSequenceFixture(kind, false), overrides);
      try {
        const { page } = fixture;
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
        // The frozen frame predates Surface: its section read at the frame's chrome inset through the base theme's
        // [data-surface-frame] rule, which Surface now gives its own section as the chrome-inset utility.
        await page.addStyleTag({ content: await rendererCss([], undefined, before === "frozen" ? frozenFrameInset : "") });
        await page.getByRole("button", { name: "Open fixture" }).click();
        await page.locator(".drawer").waitFor(); await settleMotion(page);
        await page.evaluate(async () => { await document.fonts.ready; });
        captures.push(await page.screenshot());
        contents.push(await page.locator('[data-surface-slot="content"] > *').first().screenshot());
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
    assert.deepEqual(structures[2], structures[0]);
    assert.ok(captures[2]!.equals(captures[1]!), 'default panel preserves exact viewport pixels');
    // The content itself is pixel-identical to the frame before the view-body branch existed: chrome that moved since
    // (the top-rail commit, which lets the region grow) is outside it, and anything that restyles the content is not.
    assert.ok(contents[2]!.equals(contents[0]!), 'default panel content keeps its pre-view-body pixels');
  });
}
