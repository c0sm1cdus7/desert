import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { panelSequenceFixture } from "./fixtures/panel-sequence.ts";
import { settleMotion } from "./web/fixture.ts";

for (const width of [390, 1280]) test(`authored panel gallery uses the existing nested viewer and preserves writing at ${width}px`, async () => {
  const fixture = await svelteBrowser(panelSequenceFixture("form", true, { kind: "gallery", images: [
    { asset: "coast", alt: "Coast" }, { asset: "peak", alt: "Peak" },
  ] }), {}, "http://desert.test/panel-media");
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  try {
    const { page } = fixture;
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.addStyleTag({ content: await rendererCss() });
    await page.route("**/media/**", async route => {
      if (new URL(route.request().url()).pathname.includes("peak")) await pending;
      await route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#247"/></svg>' });
    });
    const prefetched = page.waitForRequest(request => request.url().includes("/media/peak"));
    await page.getByRole("button", { name: "Open fixture" }).click();
    const pane = page.locator(".drawer"), hero = pane.locator("[data-place-header]");
    await pane.waitFor(); await settleMotion(page); await prefetched;
    await hero.getByRole("heading", { name: "New note", exact: true }).waitFor();
    assert.equal(await pane.locator('.toolbar-title').textContent(), "New note");
    await hero.getByRole("button", { name: "Photo 2: Peak" }).click();
    await page.waitForFunction(() => document.querySelector('[data-place-header] img')?.getAttribute('src')?.includes('peak'));
    assert.equal(await hero.locator("img").evaluate(node => getComputedStyle(node).visibility), "hidden");
    assert.equal(await hero.getByRole("status").count(), 0);
    await hero.getByRole("button", { name: "Open photo viewer" }).click();
    const viewer = page.locator("[data-media-viewer]");
    await viewer.waitFor();
    assert.equal(await viewer.locator("[data-toolbar-subtitle]").textContent(), "2 / 2");
    await viewer.getByRole("button", { name: "Previous media" }).click();
    await viewer.getByRole("button", { name: "Zoom in" }).click();
    await viewer.getByRole("button", { name: "Close media viewer" }).click();
    await viewer.waitFor({ state: "detached" });
    assert.equal(await hero.getByRole("button", { name: "Open photo viewer" }).evaluate(node => node === document.activeElement), true);
    assert.equal(await page.locator("[data-accepted]").textContent(), "0", "Media browsing must never submit an enclosing editor");
    const input = pane.getByRole("textbox", { name: "Title", exact: true });
    await input.fill("Writing beside media"); await input.press("Enter");
    assert.equal(await page.locator("[data-writing]").textContent(), "Writing beside media");
    assert.equal(await page.locator("[data-accepted]").textContent(), "1");
    await pane.getByRole("button", { name: "Close", exact: true }).first().click();
    await pane.waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Open fixture" }).click();
    await pane.waitFor(); await settleMotion(page);
    assert.equal(await input.inputValue(), "Writing beside media");
    assert.equal(await hero.getByRole("button", { name: "Photo 1: Coast" }).getAttribute("aria-current"), "true");
    release!();
    assert.deepEqual(fixture.errors, []);
  } finally { release!(); await fixture.close(); }
});
