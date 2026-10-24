import test from "node:test";
import assert from "node:assert/strict";
import { directSearchFixture, searchFixture, searchLabel } from "./fixtures/search-field-anatomy.ts";
import { ResolvedNodes } from "../src/interaction/catalog.ts";
import { sharedCatalogOwners } from "../src/svelte/infra/shared-owners.ts";
import { sharedPurpose } from "../src/svelte/infra/shared-purpose.ts";

for (const consumer of ["collection", "catalog"] as const) {
  test(`${consumer}: toolbar overlay search has a persistent leading icon and one embedded clear accessory`, async () => {
    const f = await searchFixture(consumer);
    try {
      const search = f.page.getByRole("searchbox", { name: searchLabel[consumer], exact: true });
      assert.equal(await search.count(), 1, "a search field exposes searchbox semantics");
      assert.equal(await f.page.locator("[data-catalog-scroll] [data-search-field]").count(), 0,
        "the underlying surface never owns an inline search field");
      assert.equal(await search.evaluate(element => !!element.closest("[data-catalog-toolbar]")), true);
      const group = f.page.locator("[data-search-field]").filter({ has: search });
      assert.equal(await group.count(), 1, "the search field owns its accessories");
      const icon = group.locator('svg[data-search-icon="leading"]');
      assert.equal(await icon.count(), 1);
      assert.equal(await icon.isVisible(), true);
      assert.equal(await icon.getAttribute("aria-hidden"), "true");
      assert.equal(await f.page.getByRole("button", { name: "Clear search", exact: true }).count(), 0);
      await search.fill("a");
      const clear = group.getByRole("button", { name: "Clear search", exact: true });
      assert.equal(await clear.count(), 1);
      assert.equal(await f.page.getByRole("button", { name: "Clear search", exact: true }).count(), 1);
      assert.equal(await icon.isVisible(), true, "typing does not replace the magnifier");
      const well = (await group.boundingBox())!, action = (await clear.boundingBox())!;
      assert.ok(action.x >= well.x && action.x + action.width <= well.x + well.width + 1);
      assert.ok(action.y >= well.y && action.y + action.height <= well.y + well.height + 1);
      assert.equal(await clear.getAttribute("type"), "button", "clearing is not a submit action");
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });

  test(`${consumer}: mouse, Enter and Space clear search without submitting and return input focus`, async () => {
    const f = await searchFixture(consumer);
    try {
      const search = f.page.getByRole("searchbox", { name: searchLabel[consumer], exact: true });
      assert.equal(await search.count(), 1);
      for (const method of ["mouse", "Enter", "Space"]) {
        await search.fill("a");
        const clear = f.page.locator("[data-search-field]").getByRole("button", { name: "Clear search", exact: true });
        if (method === "mouse") await clear.click();
        else {
          await search.press("Tab");
          assert.equal(await clear.evaluate(element => element === document.activeElement), true, "clear follows input in keyboard order");
          await clear.press(method);
        }
        assert.equal(await search.inputValue(), "");
        assert.equal(await search.evaluate(element => element === document.activeElement), true);
        assert.equal(await f.page.getByRole("status", { name: "Form submissions" }).textContent(), "0");
        assert.equal(await f.page.getByRole("button", { name: "Clear search", exact: true }).count(), 0);
      }
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });

  test(`${consumer}: an unmatched query remains clearable inside the field`, async () => {
    const f = await searchFixture(consumer);
    try {
      const search = f.page.getByRole("searchbox", { name: searchLabel[consumer], exact: true });
      assert.equal(await search.count(), 1);
      await search.fill("no-such-component-or-record-713");
      await f.page.getByText("No matching results", { exact: true }).waitFor();
      assert.equal(await f.page.locator("[data-catalog-search-scroll] [data-search-result]").count(), 0);
      const clear = f.page.locator("[data-search-field]").getByRole("button", { name: "Clear search", exact: true });
      assert.equal(await clear.count(), 1, "zero results retain the embedded recovery action");
      assert.equal(await f.page.getByRole("button", { name: "Clear search", exact: true }).count(), 1);
      await clear.click();
      assert.equal(await search.inputValue(), "");
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
      await f.page.getByRole("heading", { name: `Search in ${consumer === "collection" ? "Notes" : "Component bank"}`, exact: true }).waitFor();
      await f.page.getByRole("button", { name: "Close search", exact: true }).click();
      assert.equal(await f.page.getByRole("searchbox").count(), 0);
      if (consumer === "collection") assert.equal(await f.page.locator(".record-button").count(), 2);
      else {
        const index = f.page.locator('[data-view-item="catalog-index"]');
        assert.ok(await index.isVisible(), 'clearing discovery returns the complete component index');
        assert.ok(await index.locator('[data-focus-key]').count() > 0);
        // Coverage lives in each detail (catalog-inspector); the index is every group with every destination: each semantic
        // entry of the group and each shared owner of the group that is not part of another, counted here from the data.
        for (const group of ResolvedNodes.groups) assert.equal(
          await index.getByRole('group', { name:group.title, exact:true }).locator('[data-focus-key]').count(),
          ResolvedNodes.entries.filter(entry => entry.inspection.group === group.id).length
            + sharedCatalogOwners.filter(owner => sharedPurpose[owner].group === group.id && !sharedPurpose[owner].partOf).length, group.title);
      }
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}

test("shared search clears whitespace once, preserves read-only values, and fits both themes at 320px and 200% text", async () => {
  const f = await directSearchFixture();
  try {
    const search = f.page.getByRole("searchbox", { name: "Direct search", exact: true });
    const clear = f.page.getByRole("button", { name: "Clear search", exact: true });
    const changes = f.page.getByRole("status", { name: "Change callbacks" });
    await search.fill("   ");
    assert.equal(await changes.textContent(), '["   "]', "one callback per input event");
    await clear.click();
    assert.equal(await search.inputValue(), "");
    assert.equal(await changes.textContent(), '["   ",""]', "one callback per clear");
    await search.fill("Alpha");
    await f.page.getByRole("button", { name: "Make read only", exact: true }).click();
    assert.equal(await search.isEditable(), false);
    assert.equal(await clear.isDisabled(), true);
    await search.press("Backspace");
    await clear.evaluate(element => (element as HTMLButtonElement).click());
    assert.equal(await search.inputValue(), "Alpha");
    assert.equal(await f.page.getByRole("status", { name: "Bound query" }).textContent(), "Alpha");
    assert.equal(await changes.textContent(), '["   ","","Alpha"]');
    await f.page.getByRole("button", { name: "Disable search", exact: true }).click();
    assert.equal(await search.isDisabled(), true);
    assert.equal(await clear.isDisabled(), true);
    const backgrounds: string[] = [], fontSizes: number[] = [];
    for (const scale of [1, 2]) for (const dark of [false, true]) {
      await f.page.evaluate(({ scale, dark }) => {
        document.documentElement.dataset.theme = dark ? "dark" : "light";
        document.documentElement.style.setProperty("--text-scale", String(scale));
      }, { scale, dark });
      const field = f.page.locator("[data-search-field]");
      backgrounds.push(await field.evaluate(element => getComputedStyle(element).backgroundColor));
      fontSizes.push(await search.evaluate(element => parseFloat(getComputedStyle(element).fontSize)));
      const group = (await field.boundingBox())!;
      const icon = (await f.page.locator('[data-search-icon="leading"]').boundingBox())!;
      const input = (await search.boundingBox())!, action = (await clear.boundingBox())!;
      assert.ok(group.x >= 0 && group.x + group.width <= 320, "the field fits the narrow viewport");
      assert.ok(icon.x + icon.width <= input.x, "the magnifier precedes the input text");
      assert.ok(input.x + input.width <= action.x && action.x + action.width <= group.x + group.width);
      assert.equal(await search.inputValue(), "Alpha");
    }
    assert.notEqual(backgrounds[0], backgrounds[1], "the renderer actually switches between light and dark");
    assert.equal(fontSizes[2], fontSizes[0]! * 2, "200% text actually doubles the input font");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
