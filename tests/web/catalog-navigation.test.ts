import test from "node:test";
import assert from "node:assert/strict";
import { InteractionCatalog } from "../../src/interaction/catalog.ts";
import { browserFixture } from "./fixture.ts";

test("catalog navigation exposes the canonical inventory and its execution boundary", async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const navigation = f.page.getByRole("navigation", { name: "Catalog navigation" });
    assert.equal(await navigation.getByRole("searchbox", { name: "Find component" }).count(), 1);
    for (const entry of InteractionCatalog.entries) {
      const section = f.page.locator(`[data-catalog-entry="${entry.id}"]`);
      assert.equal(await section.isVisible(), true, `${entry.id} is visible by default`);
      assert.equal(await section.locator("[data-specimen]").count(), entry.states.length);
    }
    assert.equal(await navigation.getByRole("link").count(), InteractionCatalog.groups.length);
    for (const group of InteractionCatalog.groups)
      assert.equal(await f.page.getByRole("heading", { name: group.title, exact: true }).count(), 1);
    assert.equal(await f.page.locator('[data-foundation]').count(), 6);
    const bench = f.page.getByRole("region", { name: "Controls", exact: true });
    assert.match(await bench.textContent() ?? "", /Local specimens do not execute commands/);
    assert.equal(await f.page.getByRole('heading', {name:'Not installed in product execution',exact:true}).count(),1);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("catalog search filters by names, identifiers and states without discarding specimen edits", async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const find = f.page.getByRole("searchbox", { name: "Find component" });
    const writing = f.page.locator('[data-specimen="input.text:value"]').getByRole("textbox", { name: "Writing" });
    await writing.fill("Keep this local draft");
    await find.fill("  MONEY  ");
    assert.equal(await f.page.locator("[data-catalog-entry]:visible").count(), 1);
    assert.equal(await f.page.locator('[data-catalog-entry="control.money"]').isVisible(), true);
    await find.fill("input.multiline");
    assert.equal(await f.page.locator("[data-catalog-entry]:visible").count(), 1);
    await find.fill("uncertain");
    assert.equal(await f.page.locator('[data-catalog-entry="review"]').isVisible(), true);
    await find.fill("not-a-catalog-component");
    assert.equal(await f.page.locator("[data-catalog-entry]:visible").count(), 0);
    await f.page.getByText("No matching components", { exact: true }).waitFor();
    await f.page.getByRole("button", { name: "Clear search", exact: true }).click();
    assert.equal(await find.inputValue(), "");
    assert.equal(await find.evaluate(element => element === document.activeElement), true);
    assert.equal(await writing.inputValue(), "Keep this local draft");
    assert.equal(await f.page.locator("[data-catalog-entry]:visible").count(), InteractionCatalog.entries.length);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("invalid text specimens explain their state and associate the error with the field", async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    for (const primitive of ["input.text", "input.multiline"]) {
      const specimen = f.page.locator(`[data-specimen="${primitive}:invalid"]`);
      const field = specimen.getByRole("textbox", { name: "Writing", exact: true });
      const error = specimen.getByRole("status");
      assert.equal(await field.getAttribute("aria-invalid"), "true");
      assert.equal((await error.textContent())?.trim(), "Example validation error. This isolated specimen is intentionally invalid.");
      assert.equal(await error.isVisible(), true);
      assert.equal(await field.getAttribute("aria-describedby"), await error.getAttribute("id"));
      assert.ok(await error.getAttribute("id"), "the description references a real error element");
      const normal = f.page.locator(`[data-specimen="${primitive}:value"]`);
      assert.equal(await normal.getByRole("textbox", { name: "Writing", exact: true }).getAttribute("aria-describedby"), null);
      assert.equal(await normal.getByRole("status").count(), 0);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("catalog section navigation and return links are keyboard-accessible at compact width", async () => {
  const f = await browserFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 740 });
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    for (const width of [390, 320]) {
      await f.page.setViewportSize({ width, height: 740 });
      const geometry = await f.page.locator(".catalog-header h1").evaluate(heading => {
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
    await bench.getByRole("link", { name: "Back to catalog navigation", exact: true }).focus();
    await f.page.keyboard.press("Enter");
    assert.equal(await f.page.evaluate(() => document.activeElement?.id), "catalog-search");
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
