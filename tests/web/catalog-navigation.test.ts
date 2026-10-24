import test from "node:test";
import assert from "node:assert/strict";
import { ResolvedNodes } from "../../src/interaction/catalog.ts";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

async function catalogFixture() {
  const fixture = await publicCatalogFixture();
  await fixture.page.setViewportSize({ width: 1280, height: 900 });
  await (await navigationAction(fixture.page, "Component bank")).click();
  return fixture;
}

test("catalog navigation exposes the canonical inventory and its execution boundary", async () => {
  const f = await catalogFixture();
  try {
    const navigation = f.page.getByRole("navigation", { name: "Catalog navigation" });
    assert.equal(await navigation.getByRole("searchbox").count(), 0);
    for (const entry of ResolvedNodes.entries) {
      const section = f.page.locator(`[data-view-item="entry:${entry.id}"]`);
      assert.equal(await section.isVisible(), true, `${entry.id} is visible by default`);
      assert.equal(await section.locator("[data-view-item^='specimen:']").count(), entry.states.length);
    }
    assert.equal(await navigation.getByRole("link").count(), ResolvedNodes.groups.length);
    for (const group of ResolvedNodes.groups)
      assert.equal(await f.page.getByRole("heading", { name: group.title, exact: true }).count(), 1);
    assert.equal(await f.page.locator('[data-foundation]').count(), ResolvedNodes.foundations.length);
    const bench = f.page.getByRole("region", { name: "Controls", exact: true });
    assert.match(await bench.textContent() ?? "", /Local specimens do not execute commands/);
    assert.equal(await f.page.getByRole("searchbox").count(), 0);
  } finally { await f.close(); }
});

test("catalog toolbar searches names, identifiers and states only in an overlay, preserving specimen edits", async () => {
  const f = await catalogFixture();
  try {
    const writing = f.page.locator('[data-view-item="specimen:input.text:value"]').getByRole("textbox", { name: "Writing" });
    await writing.fill("Keep this local draft");
    await f.page.getByRole("button", { name: "Search", exact: true }).click();
    const find = f.page.getByRole("searchbox", { name: "Search component bank", exact: true });
    const results = f.page.locator("[data-catalog-search-scroll]");
    await find.fill("  MONEY  ");
    assert.equal(await results.locator("[data-search-result]").count(), 1);
    assert.equal(await results.locator('[data-search-result="control.money"]').isVisible(), true);
    await find.fill("input.multiline");
    assert.equal(await results.locator("[data-search-result]").count(), 1);
    assert.equal(await results.locator('[data-search-result="input.multiline"]').isVisible(), true);
    await find.fill("uncertain");
    assert.equal(await results.locator('[data-search-result="review"]').isVisible(), true);
    await find.fill("not-a-catalog-component");
    assert.equal(await results.locator("[data-search-result]").count(), 0);
    await results.getByText("No matching results", { exact: true }).waitFor();
    assert.equal(await f.page.locator("[data-view-item^='entry:'][hidden]").count(), 0,
      "search never filters retained surface content");
    await f.page.getByRole("button", { name: "Clear search", exact: true }).click();
    assert.equal(await find.inputValue(), "");
    assert.equal(await find.evaluate(element => element === document.activeElement), true);
    await f.page.getByRole("button", { name: "Close search", exact: true }).click();
    assert.equal(await writing.inputValue(), "Keep this local draft");
    assert.equal(await f.page.locator("[data-view-item^='entry:']:visible").count(), ResolvedNodes.entries.length);
  } finally { await f.close(); }
});

test("invalid text specimens explain their state and associate the error with the field", async () => {
  const f = await catalogFixture();
  try {
    for (const primitive of ["input.text", "input.multiline"]) {
      const specimen = f.page.locator(`[data-view-item="specimen:${primitive}:invalid"]`);
      const field = specimen.getByRole("textbox", { name: "Writing", exact: true });
      const error = specimen.getByRole("status");
      assert.equal(await field.getAttribute("aria-invalid"), "true");
      assert.equal((await error.textContent())?.trim(), "Example validation error. This isolated specimen is intentionally invalid.");
      assert.equal(await error.isVisible(), true);
      assert.equal(await field.getAttribute("aria-describedby"), await error.getAttribute("id"));
      assert.ok(await error.getAttribute("id"), "the description references a real error element");
      const normal = f.page.locator(`[data-view-item="specimen:${primitive}:value"]`);
      assert.equal(await normal.getByRole("textbox", { name: "Writing", exact: true }).getAttribute("aria-describedby"), null);
      assert.equal(await normal.getByRole("status").count(), 0);
    }
  } finally { await f.close(); }
});

test("catalog section navigation and toolbar return are keyboard-accessible at compact width", async () => {
  const f = await catalogFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 740 });
    for (const width of [390, 320]) {
      await f.page.setViewportSize({ width, height: 740 });
      await settle(f.page);
      const geometry = await f.page.locator("[data-catalog-content] [data-place-title]").first().evaluate(heading => {
        const style = getComputedStyle(heading);
        return { fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight),
          titleBottom: heading.getBoundingClientRect().bottom,
          metadataTop: heading.parentElement!.querySelector("p")!.getBoundingClientRect().top };
      });
      assert.ok(geometry.lineHeight >= geometry.fontSize, `wrapped title lines do not overlap at ${width}px`);
      assert.ok(geometry.titleBottom <= geometry.metadataTop + 1, `title does not overlap metadata at ${width}px`);
    }
    const navigation = f.page.getByRole("navigation", { name: "Catalog navigation" });
    const jump = navigation.getByRole("link", { name: /^Controls/ });
    await jump.focus();
    await f.page.keyboard.press("Enter");
    assert.equal(await f.page.evaluate(() => document.activeElement?.id), "catalog-controls");
    const bench = f.page.getByRole("region", { name: "Controls", exact: true });
    assert.equal(await bench.getByRole("link", { name: "Back to catalog navigation", exact: true }).count(), 0);
    await f.page.locator('[data-catalog-content] [data-place-toolbar]')
      .getByRole("button", { name: "Back to top", exact: true }).focus();
    await f.page.keyboard.press("Enter");
    await f.page.waitForFunction(() => document.querySelector('[data-catalog-content] > .place-viewport')!.scrollTop === 0);
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await f.close(); }
});
