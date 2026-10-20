import assert from "node:assert/strict";
import type { Locator, Page } from "playwright";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

export const toolbar = (page: Page) => page.locator("[data-catalog-toolbar]");
export const searchInput = (page: Page) => toolbar(page).getByRole("searchbox");
export const cancelSearch = (page: Page) => toolbar(page).getByRole("button", { name: /^(Close|Cancel) search$/ });
export const results = (page: Page) => page.locator("[data-catalog-search-results]");
export const content = (page: Page) => page.locator("[data-catalog-content]");
export const background = (page: Page) => page.locator("[data-catalog-scroll]");

export async function openDestination(page: Page, name: string) {
  await page.setViewportSize({ width: 1100, height: 740 });
  await (await navigationAction(page, name)).click();
  await settle(page);
}

export async function enterSearch(page: Page, keyboard = false) {
  const input = searchInput(page);
  if (!await input.isVisible()) {
    const opener = toolbar(page).getByRole("button", { name: "Search", exact: true });
    if (keyboard) { await opener.focus(); await page.keyboard.press("Enter"); }
    else await opener.click();
  }
  if (keyboard) await input.focus();
  else await input.click();
  await settle(page);
  return input;
}

export async function assertSearchActive(page: Page, scope: string) {
  assert.ok(await cancelSearch(page).isVisible(), "Focusing search enters a dismissible mode before any text is entered");
  assert.ok(await page.getByRole("region", { name: `Search in ${scope}`, exact: true }).isVisible(),
    "The foreground search area exposes its current scope accessibly");
  assert.ok(await toolbar(page).getByRole("searchbox", { name: new RegExp(scope, "i") }).isVisible());
  assert.match((await searchInput(page).getAttribute("placeholder")) ?? "", new RegExp(scope, "i"));
  const controls = await searchInput(page).getAttribute("aria-controls");
  if (controls) for (const id of controls.split(/\s+/u)) {
    assert.equal(await page.locator(`[id="${id}"]`).count(), 1, "Search relationships reference a real result region");
  }
  assert.equal(await background(page).getAttribute("aria-hidden"), "true", "Background content leaves the accessibility tree");
  assert.ok(await background(page).evaluate(element => element.hasAttribute("inert")), "Retained content cannot receive input");
}

export async function assertExited(page: Page, destination: string, expectedScroll?: number) {
  await settle(page);
  assert.equal(await cancelSearch(page).isVisible(), false, "Exit is a single action, not merely clearing the query");
  assert.equal(await results(page).isVisible(), false);
  assert.equal(await content(page).getAttribute("data-destination"), destination);
  assert.notEqual(await background(page).getAttribute("aria-hidden"), "true");
  assert.equal(await background(page).evaluate(element => element.hasAttribute("inert")), false);
  assert.ok(await page.evaluate(() => document.activeElement !== document.body &&
    !document.activeElement?.closest("[inert], [aria-hidden='true']")), "Focus returns to usable visible context");
  if (expectedScroll !== undefined) {
    const actual = await background(page).evaluate(element => element.scrollTop);
    assert.ok(Math.abs(actual - expectedScroll) <= 1, `Restore scroll: expected ${expectedScroll}, observed ${actual}`);
  }
}

export async function setScroll(page: Page, top = 320) {
  const value = await background(page).evaluate((element, next) => { element.scrollTop = next; return element.scrollTop; }, top);
  assert.ok(value > 0, "The scroll-restoration witness must start away from the top");
  return value;
}

export async function assertCenteredInvitation(page: Page, scope: string) {
  const heading = await results(page).getByRole("heading", { name: `Search in ${scope}`, exact: true }).boundingBox();
  const area = await content(page).boundingBox(), chrome = await toolbar(page).boundingBox();
  assert.ok(heading && area && chrome);
  assert.ok(Math.abs(heading.x + heading.width / 2 - area.x - area.width / 2) <= 24,
    "The empty invitation is horizontally centered in the content area");
  const bottomToolbar = chrome.y > area.y + area.height / 2;
  const top = bottomToolbar ? area.y : chrome.y + chrome.height;
  const bottom = bottomToolbar ? chrome.y : area.y + area.height;
  const height = bottom - top, center = heading.y + heading.height / 2;
  assert.ok(center >= top + height * .25 && center <= top + height * .75,
    "The invitation occupies the center of the available reading area, not a result row at the top");
}

export async function assertExposed(locator: Locator) {
  const state = await locator.evaluate(element => {
    const box = element.getBoundingClientRect(), x = box.left + box.width / 2, y = box.top + box.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom,
      width: innerWidth, height: innerHeight, exposed: hit === element || !!hit && element.contains(hit) };
  });
  assert.ok(state.left >= 0 && state.right <= state.width && state.top >= 0 && state.bottom <= state.height && state.exposed,
    `Search controls remain fully exposed: ${JSON.stringify(state)}`);
}

export async function blurState(page: Page) {
  return page.locator("[data-catalog-workspace]").evaluate(element => [...element.querySelectorAll("*")].flatMap(child => {
    const css = getComputedStyle(child), box = child.getBoundingClientRect();
    const styles = [css, getComputedStyle(child, "::before"), getComputedStyle(child, "::after")];
    return box.width && box.height ? styles.map(style => ({ filter: style.filter, backdrop: style.backdropFilter })) : [];
  }));
}

export async function searchSoftening(page: Page) {
  return page.locator("[data-catalog-search-material], [data-catalog-search-scroll], [data-catalog-scroll]").evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return style.filter + style.backdropFilter;
  }));
}

export async function assertReducedMotion(page: Page) {
  const durations = await page.locator("[data-catalog-search-material], [data-catalog-search-scroll], [data-catalog-search-prompt], [data-catalog-toolbar]")
    .evaluateAll(elements => elements.flatMap(element => [element, ...element.querySelectorAll("*")]).flatMap(element => {
      const style = getComputedStyle(element);
      return [style.animationDuration, style.transitionDuration].flatMap(value => value.split(",").map(parseFloat));
    }));
  assert.ok(durations.length > 0 && durations.every(duration => duration <= .001),
    `Reduced-motion search transition/animation durations: ${durations}`);
}

export async function setSearchPreferences(page: Page, reduced: boolean) {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" },
    { name: "prefers-reduced-transparency", value: reduced ? "reduce" : "no-preference" },
    { name: "prefers-contrast", value: "no-preference" },
  ] });
}

// An opaque foreground must paint identically with or without the inert page.
// This catches escaped child stacking contexts that computed blur cannot detect.
export async function assertOpaqueForeground(page: Page) {
  const foreground = page.locator("[data-catalog-search-scroll]"), retained = background(page);
  const before = await foreground.screenshot({ animations: "disabled" });
  const previous = await retained.evaluate(element => (element as HTMLElement).style.visibility);
  try {
    await retained.evaluate(element => (element as HTMLElement).style.visibility = "hidden");
    const after = await foreground.screenshot({ animations: "disabled" });
    assert.ok(before.equals(after), "Opaque search foreground must not leak retained card titles or other background paint");
  } finally { await retained.evaluate((element, value) => (element as HTMLElement).style.visibility = value, previous); }
}

// Cancellation must resume the person's editing context, not place Tab before
// the search field and immediately reopen the mode they just left.
export async function assertKeyboardRecovery(page: Page, exit: string) {
  await openDestination(page, "Travel kit");
  const field = page.getByRole("textbox", { name: "Trip name", exact: true });
  await field.fill("Keyboard recovery draft");
  await field.evaluate(element => (element as HTMLInputElement).setSelectionRange(4, 8));
  await (await enterSearch(page, true)).fill("arrival");
  if (exit === "cancel") await cancelSearch(page).click(); else await page.keyboard.press("Escape");
  await assertExited(page, "travel-kit");
  assert.ok(await field.evaluate(element => element === document.activeElement), "Cancellation restores the previously focused local field");
  assert.deepEqual(await field.evaluate(element => [(element as HTMLInputElement).selectionStart,
    (element as HTMLInputElement).selectionEnd]), [4, 8], "The editing selection survives search");
  await page.keyboard.press("Tab");
  assert.equal(await cancelSearch(page).isVisible(), false, "Forward Tab after cancellation must not immediately reopen search");
  assert.ok(await background(page).evaluate(element => element.contains(document.activeElement)),
    "Keyboard traversal continues through the restored page");
  await content(page).focus();
  await enterSearch(page, true);
  if (exit === "cancel") await cancelSearch(page).click(); else await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  assert.equal(await cancelSearch(page).isVisible(), false,
    "Without a prior field, cancellation still resumes after the toolbar instead of reopening search");
}
