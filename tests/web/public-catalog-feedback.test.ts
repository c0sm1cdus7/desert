import test from "node:test";
import assert from "node:assert/strict";
import type { Locator } from "playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { evidence, navigationAction, settle } from "./public-catalog-expectations.ts";

async function rowAppearance(control: Locator) {
  return control.evaluate(element => {
    const row = element.closest('[data-slot="field-label"]');
    if (!row) throw new Error("Choice has no visible sibling-row surface");
    const style = getComputedStyle(row);
    return { background: style.backgroundColor, image: style.backgroundImage,
      backdrop: style.backdropFilter, hovered: row.matches(":hover") };
  });
}

test("enabled choice sibling rows have hover feedback without adding a per-row glass layer", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await (await navigationAction(page, "Component bank")).click();
    await page.getByRole("searchbox", { name: "Find component", exact: true }).fill("control.options");
    const states = [];
    for (const role of ["radio", "checkbox"] as const) {
      const choice = page.getByRole(role, { name: "First option", exact: true });
      await choice.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await settle(page);
      const normal = await rowAppearance(choice);
      await choice.hover();
      await settle(page);
      const hover = await rowAppearance(choice);
      states.push({ role, normal, hover });
    }
    await evidence(page, "bank-choice-hover", { states, diagnostics: fixture.diagnostics.snapshot() });
    for (const { role, normal, hover } of states) {
      assert.ok(hover.hovered, `${role}: pointer really entered the row`);
      assert.ok(normal.background !== hover.background || normal.image !== hover.image,
        `${role}: enabled sibling row needs observable hover feedback, like the other interactive rows`);
      assert.equal(hover.backdrop, "none", `${role}: hover must not create another glass panel inside the shared group`);
    }
  } finally { await fixture.close(); }
});
