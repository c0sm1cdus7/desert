import assert from "node:assert/strict";
import test from "node:test";
import type { Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { workspaceCss } from "./fixtures/workspace-css.ts";
import { workspaceRuntimeSource } from "./fixtures/workspace-runtime.ts";

const css = workspaceCss();
async function mount(width: number, options: Parameters<typeof workspaceRuntimeSource>[0] = {}) {
  const fixture = await svelteBrowser(workspaceRuntimeSource(options), {}, "http://workspace-runtime.test/");
  try {
    await fixture.page.setViewportSize({ width, height: 900 });
    await fixture.page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await fixture.page.addStyleTag({ content: await css });
    await fixture.page.locator("[data-place-title]").filter({ hasText: "Home" }).waitFor();
    await settle(fixture.page);
    return fixture;
  } catch (error) { await fixture.close(); throw error; }
}
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let index = 0; index < 4; index++) await new Promise(requestAnimationFrame);
  });
}
const action = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const navigation = (page: Page) => page.getByRole("navigation", { name: "Main navigation", exact: true });
async function frame(page: Page) {
  return page.locator("[data-catalog-content]").evaluate(node => {
    const box = node.getBoundingClientRect();
    return { x: box.x, width: box.width, height: box.height, windowX: scrollX, windowY: scrollY,
      documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth };
  });
}
function assertCanvas(value: Awaited<ReturnType<typeof frame>>) {
  assert.equal(value.x, 0, "floating navigation never moves the parent surface");
  assert.equal(value.width, value.viewportWidth, "the parent surface spans behind navigation");
  assert.equal(value.height, 900);
  assert.equal(value.windowX, 0); assert.equal(value.windowY, 0);
  assert.ok(value.documentWidth <= value.viewportWidth, "no horizontal document overflow");
}

test("the declared left View owns its title and remains mounted across destinations", async () => {
  const fixture = await mount(1280, { title: "Workspace library" });
  try {
    const { page } = fixture;
    const pane = page.locator("[data-catalog-navigation]");
    await pane.getByRole("heading", { name: "Workspace library", exact: true }).waitFor();
    assert.equal(await pane.getByText("Shared destinations", { exact: true }).count(), 1);
    assert.equal(await pane.getByRole("heading", { name: "Notebook", exact: true }).count(), 0,
      "a literal declared title is not overwritten by the product label");
    const original = await pane.elementHandle();
    for (const name of ["Notes", "Media", "Home"]) {
      await navigation(page).getByRole("button", { name, exact: true }).click();
      await page.locator("[data-place-title]").filter({ hasText: name }).waitFor();
      assert.ok(await pane.evaluate((node, prior) => node === prior, original), "navigation is a retained shared surface");
      assert.equal(await navigation(page).getByRole("button", { name, exact: true }).getAttribute("aria-current"), "page");
      assertCanvas(await frame(page));
    }
    const guide = await pane.evaluate(node => {
      const left = (selector: string) => {
        const range = document.createRange(); range.selectNodeContents(node.querySelector(selector)!);
        return range.getBoundingClientRect().left;
      };
      return { title: left("[data-toolbar-title]"), group: left("[data-sidebar='group-label']") };
    });
    assert.ok(Math.abs(guide.title - guide.group) < .5, `the shared title and content use one reading guide: ${JSON.stringify(guide)}`);
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

test("a root without a left dock does not receive implicit navigation", async () => {
  const fixture = await mount(1280, { navigation: false });
  try {
    assert.equal(await navigation(fixture.page).count(), 0);
    assert.equal(await fixture.page.locator("[data-catalog-navigation]").count(), 0);
    assert.equal(await fixture.page.getByRole("button", { name: /^(Show|Hide) navigation$/ }).count(), 0);
    for (const shortcut of ["Control+b", "Meta+b"]) {
      await fixture.page.keyboard.press(shortcut); await settle(fixture.page);
      assert.equal(await navigation(fixture.page).count(), 0, "shortcuts cannot fabricate an undeclared dock");
      assert.equal(await fixture.page.locator("[data-catalog-content]").evaluate(node =>
        getComputedStyle(node).getPropertyValue("--place-leading-inset").trim()), "0px");
    }
    assert.ok(await action(fixture.page, "Search").isVisible());
    assertCanvas(await frame(fixture.page));
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

for (const width of [390, 1280]) test(`declared navigation preserves scroll and overlay search at ${width}px`, async () => {
  const fixture = await mount(width);
  try {
    const { page } = fixture;
    const wrapper = page.locator("[data-slot='sidebar-wrapper']");
    assert.equal(await wrapper.getAttribute("data-presentation"), width === 390 ? "overlay" : "docked");
    if (width === 390) await action(page, "Show navigation").click();
    await page.locator("[data-catalog-navigation]").getByRole("heading", { name: "Notebook", exact: true }).waitFor();
    assertCanvas(await frame(page));
    await action(page, "Hide navigation").click();
    await action(page, "Show navigation").waitFor();
    assertCanvas(await frame(page));
    await action(page, "Show navigation").click();
    await navigation(page).getByRole("button", { name: "Media", exact: true }).click();
    await page.locator("[data-place-title]").filter({ hasText: "Media" }).waitFor();
    if (width === 390) {
      // The overlay is a Modal whose presence unmounts it after its exit settles (a frame or more after the place changes).
      await navigation(page).waitFor({ state: "detached" });
      assert.equal(await navigation(page).count(), 0, "choosing a destination dismisses overlay navigation");
      await action(page, "Show navigation").click();
    }
    await navigation(page).getByRole("button", { name: "Home", exact: true }).click();
    await page.locator("[data-place-title]").filter({ hasText: "Home" }).waitFor();
    const viewport = page.locator("[data-catalog-scroll]");
    await page.mouse.move(width - 60, 500); await page.mouse.wheel(0, 700);
    await page.waitForFunction(() => document.querySelector("[data-catalog-scroll]")!.scrollTop > 0);
    const beforeSearch = await viewport.evaluate(node => node.scrollTop);
    assertCanvas(await frame(page));
    await action(page, "Search").click();
    const search = page.getByRole("searchbox", { name: "Search home", exact: true });
    await search.fill("Section 4");
    assert.equal(await viewport.getAttribute("aria-hidden"), "true");
    assert.equal(await viewport.evaluate(node => node instanceof HTMLElement && node.inert), true);
    await page.locator('[data-catalog-search-scroll] [data-focus-key="search:section-4"]').waitFor();
    await page.keyboard.press("Escape");
    await action(page, "Search").waitFor();
    assert.equal(await page.getByRole("searchbox").count(), 0, "search remains an overlay, not inline content");
    assert.equal(await viewport.evaluate(node => node.scrollTop), beforeSearch, "dismissing search preserves the content position");
    assert.equal(await viewport.evaluate(node => node instanceof HTMLElement && node.inert), false);
    assertCanvas(await frame(page));
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});
