import assert from "node:assert/strict";
import test from "node:test";
import { basename } from "node:path";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, evidence, settle } from "./public-catalog-expectations.ts";
import { assertExited, assertExposed, background, cancelSearch, content, enterSearch, openDestination,
  results, searchInput, setSearchPreferences, toolbar } from "./public-search-mode-helpers.ts";

// Written against frozen v24 before the new toolbar implementation. User's latest
// explicit exception retains search glass for ALL query states, across sidebar.
// Search starts collapsed, owns the full toolbar, and dismisses without losing
// a result activation. Desktop stays top; compact search controls sit at bottom.
const build = basename(process.env.DESERT_CATALOG_BUILD ?? "default");
const opener = (page: Parameters<typeof toolbar>[0]) => toolbar(page).getByRole("button", { name: "Search", exact: true });

test("search starts as a magnifier and expands to the full toolbar with a single close affordance", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await openDestination(page, "Landmarks"); await action(page, "Learn More").click();
    await action(page, "Back").waitFor();
    assert.ok(await opener(page).isVisible(), "The initial search affordance is a collapsed magnifier");
    assert.equal(await searchInput(page).isVisible(), false, "The initial toolbar is not already an expanded text field");
    await opener(page).focus(); await page.keyboard.press("Enter"); await settle(page);
    await assertExposed(searchInput(page)); await assertExposed(cancelSearch(page));
    assert.ok(await searchInput(page).evaluate(element => document.activeElement === element));
    assert.equal(await opener(page).isVisible(), false, "Magnifier becomes close, not a second visible action");
    assert.ok(await toolbar(page).getByRole("button", { name: "Close search", exact: true }).isVisible());
    assert.equal(await action(page, "Back").isVisible(), false);
    assert.equal(await page.getByRole("button", { name: /^(Show|Hide|Toggle) navigation$/ }).count(), 0,
      "Competing toolbar actions leave the active accessible controls");
    const bounds = (await toolbar(page).boundingBox())!;
    const field = (await toolbar(page).locator('[data-slot="input-group"]').boundingBox())!;
    const close = (await cancelSearch(page).boundingBox())!;
    const left = Math.min(field.x, close.x), right = Math.max(field.x + field.width, close.x + close.width);
    assert.ok(left - bounds.x <= 12 && bounds.x + bounds.width - right <= 12,
      "Expanded search and close consume the available toolbar, not a fixed-width pill");
    assert.ok(field.width >= bounds.width - close.width - 32, "The field receives the remaining toolbar width");
    await evidence(page, `search-toolbar-expanded-${build}`, { bounds, field, close });
    await cancelSearch(page).click(); await assertExited(page, "browse");
    assert.ok(await opener(page).isVisible()); assert.equal(await searchInput(page).isVisible(), false);
    assert.ok(await action(page, "Back").isVisible());
  } finally { await fixture.close(); }
});

test("one full-workspace search material remains glass for empty, matching and zero-result queries", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await setSearchPreferences(page, false); await openDestination(page, "Landmarks"); await enterSearch(page);
    const states = [];
    for (const query of ["", "Fuji", "no-such-landmark-731"]) {
      await searchInput(page).fill(query); await settle(page);
      const material = page.locator("[data-catalog-search-material]");
      assert.equal(await material.count(), 1, "Search has exactly one shared page material");
      const state = await material.evaluate(element => {
        const style = getComputedStyle(element), rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height, x: rect.x, y: rect.y, viewportWidth: innerWidth,
          viewportHeight: innerHeight, backdrop: style.backdropFilter, background: style.backgroundColor };
      });
      assert.equal(state.x, 0); assert.equal(state.y, 0);
      assert.equal(state.width, state.viewportWidth); assert.equal(state.height, state.viewportHeight);
      assert.match(state.backdrop, /blur\((?!0px)/u);
      assert.match(state.background, /(?:rgba|color\()/u, "Normal search keeps a translucent fill even with results");
      assert.equal(await page.locator("[data-catalog-background-extension]").count(), 0, "The parent media is not duplicated behind the sidebar");
      const hero = (await page.locator('[data-catalog-content] > [data-place-header] [data-place-media]').first().boundingBox())!;
      assert.equal(hero.x, 0); assert.equal(hero.width, state.viewportWidth, "The original hero spans beneath the floating sidebar");
      const filters = await page.locator("[data-catalog-search-scroll], [data-catalog-scroll]").evaluateAll(elements =>
        elements.map(element => ({ filter: getComputedStyle(element).filter, backdrop: getComputedStyle(element).backdropFilter })));
      assert.ok(filters.every(value => value.filter === "none" && value.backdrop === "none"), "The page is not filtered a second time");
      const sharp = await page.locator("[data-catalog-navigation], [data-catalog-search-prompt], [data-catalog-toolbar]")
        .evaluateAll(elements => elements.every(element => {
          for (let current: Element | null = element; current; current = current.parentElement) {
            if (getComputedStyle(current).filter !== "none") return false;
          }
          return true;
        }));
      assert.ok(sharp, "Navigation, prompt and toolbar are sharp functional foreground, not inside the blurred content");
      states.push({ query, state, filters });
      await evidence(page, `search-workspace-${query ? query === "Fuji" ? "results" : "zero" : "empty"}-${build}`, states);
    }
    const inputMaterial = await toolbar(page).locator('[data-slot="input-group"]').evaluate(element => {
      const style = getComputedStyle(element); return { background: style.backgroundColor, backdrop: style.backdropFilter };
    });
    assert.match(inputMaterial.backdrop, /blur\((?!0px)/u, "The input is its own glass control");
    assert.match(inputMaterial.background, /(?:rgba|color\()/u);
  } finally { await fixture.close(); }
});

test("outside pointer and genuine focus loss dismiss search while preserving the local draft", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await openDestination(page, "Travel kit");
    const field = page.getByRole("textbox", { name: "Trip name", exact: true });
    await field.fill("Outside dismissal draft"); const handle = await field.elementHandle();
    await enterSearch(page); const area = (await content(page).boundingBox())!;
    await page.mouse.click(area.x + area.width - 20, area.y + area.height - 40);
    await assertExited(page, "travel-kit");
    assert.equal(await field.inputValue(), "Outside dismissal draft");
    assert.ok(await field.evaluate((element, prior) => element === prior, handle));
    await enterSearch(page); await searchInput(page).fill("Trip name");
    const clear = action(page, "Clear search"); await clear.focus();
    assert.ok(await results(page).isVisible(), "Internal field-to-Clear focus remains within search");
    await clear.click(); assert.ok(await searchInput(page).evaluate(element => element === document.activeElement));
    const outside = page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("button", { name: "Landmarks", exact: true });
    await outside.focus(); await settle(page);
    assert.equal(await results(page).isVisible(), false, "Focus leaving the composite closes search");
    assert.ok(await outside.evaluate(element => element === document.activeElement), "Dismissal does not steal intentionally moved focus");
    await page.keyboard.press("Tab"); assert.equal(await results(page).isVisible(), false, "Tab after exit does not reopen search");
    assert.equal(await field.inputValue(), "Outside dismissal draft");
  } finally { await fixture.close(); }
});

test("pointer and keyboard result activation survive automatic blur dismissal", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await openDestination(page, "Landmarks");
    for (const keyboard of [false, true]) {
      await (await enterSearch(page)).fill("ASIA 1707");
      const result = results(page).getByRole("button", { name: "Mount Fuji", exact: true });
      if (keyboard) { await result.focus(); assert.ok(await results(page).isVisible()); await page.keyboard.press("Enter"); }
      else await result.click();
      await action(page, "Back").waitFor();
      assert.ok(await content(page).getByRole("heading", { name: "Mount Fuji", exact: true }).isVisible());
      await action(page, "Back").click(); await settle(page);
      assert.equal(await searchInput(page).inputValue(), "ASIA 1707"); await cancelSearch(page).click();
    }
  } finally { await fixture.close(); }
});

test("compact search is a bottom toolbar with full-width typing space and touch targets", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await openDestination(page, "Travel kit"); await enterSearch(page);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 640 }); await settle(page);
      const bar = (await toolbar(page).boundingBox())!, input = (await searchInput(page).boundingBox())!;
      const close = (await cancelSearch(page).boundingBox())!;
      await assertExposed(searchInput(page)); await assertExposed(cancelSearch(page));
      assert.ok(bar.y >= 640 - bar.height - 48 && bar.y + bar.height <= 640, "Compact search belongs above the bottom safe edge");
      assert.ok(input.width >= width - close.width - 80, "Typing width tracks the compact viewport");
      assert.ok(input.height >= 44 && close.width >= 44 && close.height >= 44, "Touch targets remain44px");
      assert.ok(await searchInput(page).evaluate(element => element === document.activeElement));
      await evidence(page, `search-toolbar-compact${width}-${build}`, { bar, input, close });
    }
  } finally { await fixture.close(); }
});

test("rapid open-close-open leaves one usable final search mode", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await setSearchPreferences(page, false); await openDestination(page, "Landmarks");
    await opener(page).click(); await page.keyboard.press("Escape");
    await opener(page).click(); await searchInput(page).fill("Fuji"); await settle(page);
    assert.equal(await page.locator("[data-catalog-search-material]").count(), 1);
    assert.equal(await searchInput(page).inputValue(), "Fuji"); await assertExposed(searchInput(page));
    assert.ok(await results(page).getByRole("button", { name: "Mount Fuji", exact: true }).isVisible());
    assert.equal(await background(page).getAttribute("aria-hidden"), "true");
    await cancelSearch(page).click(); await assertExited(page, "browse");
  } finally { await fixture.close(); }
});
