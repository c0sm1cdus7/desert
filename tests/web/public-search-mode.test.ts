import test from "node:test";
import assert from "node:assert/strict";
import { basename } from "node:path";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, evidence, settle } from "./public-catalog-expectations.ts";
import { assertCenteredInvitation, assertExited, assertExposed, assertKeyboardRecovery, assertOpaqueForeground, assertReducedMotion, assertSearchActive, background, blurState, cancelSearch,
  content, enterSearch, openDestination, results, searchInput, searchSoftening, setScroll, setSearchPreferences } from "./public-search-mode-helpers.ts";

// Independent expectations recorded before inspecting the search implementation:
// - Activating the search affordance enters scoped search and focuses its field.
// - The prior page stays mounted, softened and inert; queries never navigate it.
// - Clear stays in search; Cancel/Escape restores destination, detail and scroll.
// - Local drafts survive; only explicitly activating a result changes context.
// - IME Escape cannot dismiss search; keyboard focus never reaches inert content.
// - Resizing and reduced preferences retain usable search and dismissal controls.
const build = basename(process.env.DESERT_CATALOG_BUILD ?? "build/landmarks-web-v1");
const destinations = [
  { name: "Landmarks", id: "browse" }, { name: "Component bank", id: "bank" }, { name: "Travel kit", id: "exercises" },
];

for (const destination of destinations) test(`empty toolbar search is a distinct mode in ${destination.name}`, async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await setSearchPreferences(page, false);
    await openDestination(page, destination.name);
    const route = page.url(), previous = await content(page).getAttribute("data-destination");
    const input = await enterSearch(page);
    await evidence(page, `search-empty-${destination.id}-${build}`, { destination, route, approval: "pending" });
    await assertSearchActive(page, destination.name);
    assert.equal(await input.inputValue(), "");
    assert.ok(await results(page).getByRole("heading", { name: `Search in ${destination.name}`, exact: true }).isVisible());
    await assertCenteredInvitation(page, destination.name);
    assert.match(await results(page).innerText(), /type|search|find/i);
    assert.equal(await content(page).getAttribute("data-destination"), previous, "Entering search does not navigate");
    assert.equal(page.url(), route);
    assert.ok((await searchSoftening(page)).some(style => /blur\((?!0px)/.test(style)),
      "Ordinary search visually softens the retained background");
    await cancelSearch(page).click();
    await assertExited(page, previous!);
  } finally { await fixture.close(); }
});

for (const name of ["Component bank", "Travel kit"]) test(`${name} search stays scoped and preserves the mounted draft`, async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await openDestination(page, name);
    const field = name === "Travel kit" ? page.getByRole("textbox", { name: "Trip name", exact: true }) :
      page.locator('[data-view-item="specimen:input.text:value"]').getByRole("textbox");
    await field.fill("Keep this local search witness");
    const handle = await field.elementHandle(), destination = (await content(page).getAttribute("data-destination"))!;
    const scroll = await setScroll(page), input = await enterSearch(page);
    await input.fill(name === "Travel kit" ? "Trip name" : "money");
    await settle(page);
    await assertSearchActive(page, name);
    assert.equal(await content(page).getAttribute("data-destination"), destination, "Query edits cannot switch to Browse");
    assert.match(await results(page).innerText(), name === "Travel kit" ? /Your next visit/ : /Money/i);
    assert.equal(await results(page).getByRole("button", { name: "Mount Fuji", exact: true }).count(), 0,
      "Bank/Travel searches do not return unrelated landmark cards");
    await input.fill("no-such-search-witness-72f3");
    await settle(page);
    assert.match(await results(page).innerText(), /no (matching|results)/i);
    await page.getByRole("button", { name: "Clear search", exact: true }).click();
    await assertSearchActive(page, name);
    assert.equal(await input.inputValue(), "");
    assert.ok(await input.evaluate(element => element === document.activeElement), "Clear returns typing focus");
    await cancelSearch(page).click();
    await assertExited(page, destination, scroll);
    assert.equal(await field.inputValue(), "Keep this local search witness");
    assert.ok(await field.evaluate((element, previous) => element === previous, handle), "Search does not remount local draft controls");
  } finally { await fixture.close(); }
});

for (const exit of ["cancel", "escape"]) test(`${exit} restores detail, reading position and keyboard editing context`, async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await openDestination(page, "Landmarks");
    await page.setViewportSize({ width: 1100, height: 450 });
    await action(page, "Learn More").click();
    await action(page, "Back").waitFor();
    const original = await background(page).innerText(), scroll = await setScroll(page, 100);
    const input = await enterSearch(page, exit === "escape");
    await input.fill("Wulingyuan");
    await settle(page);
    await assertSearchActive(page, "Landmarks");
    assert.ok(await results(page).getByRole("button", { name: "Wulingyuan", exact: true }).isVisible());
    if (exit === "cancel") await cancelSearch(page).click(); else await page.keyboard.press("Escape");
    await assertExited(page, "browse", scroll);
    assert.equal(await background(page).innerText(), original, "The previously selected detail is restored exactly");
    assert.ok(await action(page, "Back").isVisible());
    await action(page, "Back").click();
    assert.ok(await action(page, "Learn More").isVisible(), "The original detail backstack is intact");
    await assertKeyboardRecovery(page, exit);
  } finally { await fixture.close(); }
});

test("composing Escape stays in search and background controls stay inert until search closes", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await openDestination(page, "Landmarks");
    const input = await enterSearch(page, true);
    await assertSearchActive(page, "Landmarks");
    await input.dispatchEvent("compositionstart", { data: "富" });
    await input.fill("富");
    await input.dispatchEvent("keydown", { key: "Escape", code: "Escape", isComposing: true, bubbles: true });
    await assertSearchActive(page, "Landmarks");
    await input.dispatchEvent("compositionend", { data: "富" });
    for (let index = 0; index < 8 && await cancelSearch(page).isVisible(); index++) {
      await page.keyboard.press("Tab");
      if (await cancelSearch(page).isVisible()) assert.equal(await background(page).evaluate(element => element.contains(document.activeElement)), false,
        "Keyboard traversal cannot enter the retained background");
    }
    assert.equal(await cancelSearch(page).isVisible(), false, "Forward Tab can leave the search composite without a focus trap");
    if (!await cancelSearch(page).isVisible()) await enterSearch(page, true); else await input.focus();
    await page.keyboard.press("Escape");
    await assertExited(page, "browse");
  } finally { await fixture.close(); }
});

test("an explicit landmark result opens detail and Back restores search query", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await openDestination(page, "Landmarks");
    await (await enterSearch(page)).fill("ASIA 1707");
    await assertSearchActive(page, "Landmarks");
    const result = results(page).getByRole("button", { name: "Mount Fuji", exact: true });
    await result.click();
    await action(page, "Back").waitFor();
    assert.ok(await content(page).getByRole("heading", { name: "Mount Fuji", exact: true }).isVisible());
    await action(page, "Back").click();
    await assertSearchActive(page, "Landmarks");
    assert.equal(await searchInput(page).inputValue(), "ASIA 1707");
    assert.ok(await result.evaluate(element => element === document.activeElement), "Back restores the actual search result focus");
  } finally { await fixture.close(); }
});

for (const [scope, query, heading] of [["Component bank", "money", "Money"], ["Travel kit", "Trip name", "Your next visit"]] as const) {
  test(`${scope} result reveals and focuses its existing content`, async () => {
    const fixture = await publicCatalogFixture();
    try {
      const { page } = fixture;
      await openDestination(page, scope);
      const destination = (await content(page).getAttribute("data-destination"))!;
      await (await enterSearch(page)).fill(query);
      await assertSearchActive(page, scope);
      await results(page).getByRole("button", { name: new RegExp(heading) }).click();
      await assertExited(page, destination);
      const target = page.getByRole("heading", { name: heading, exact: true });
      await assertExposed(target);
      assert.ok(await target.evaluate(element => element === document.activeElement), "The matched content owns keyboard focus");
    } finally { await fixture.close(); }
  });
}

test("active search survives wide-to-compact resize with accessible controls", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await openDestination(page, "Travel kit");
    await (await enterSearch(page)).fill("Trip name");
    for (const width of [390, 320, 1100]) {
      await page.setViewportSize({ width, height: 640 });
      await settle(page);
      await assertSearchActive(page, "Travel kit");
      assert.equal(await searchInput(page).inputValue(), "Trip name");
      await assertExposed(searchInput(page));
      await assertExposed(cancelSearch(page));
      assert.ok(await searchInput(page).evaluate(element => element === document.activeElement), "Resize preserves writing focus");
    }
  } finally { await fixture.close(); }
});

test("reduced motion and transparency retain an opaque, usable search mode", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await setSearchPreferences(page, true);
    await openDestination(page, "Landmarks");
    await enterSearch(page, true);
    await assertSearchActive(page, "Landmarks");
    assert.ok((await blurState(page)).every(style => !/blur\((?!0px)/.test(style.filter + style.backdrop)),
      "Reduced transparency removes background blur rather than retaining a decorative effect");
    await assertExposed(searchInput(page));
    await assertExposed(cancelSearch(page));
    await assertReducedMotion(page);
    await evidence(page, `search-reduced-${build}`, { preference: "reduced motion and transparency", approval: "pending" });
    await assertOpaqueForeground(page);
    await page.keyboard.press("Escape");
    await assertExited(page, "browse");
  } finally { await fixture.close(); }
});
