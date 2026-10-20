import assert from "node:assert/strict";
import test from "node:test";
import { basename } from "node:path";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { evidence, settle } from "./public-catalog-expectations.ts";
import { assertReducedMotion, cancelSearch, enterSearch, openDestination, searchInput, setSearchPreferences, toolbar } from "./public-search-mode-helpers.ts";

// Independent motion acceptance: observable interpolation, immediate input,
// bounded settling, no layout overflow, and an actually painted focus marker.
// Easing/durations are not copied from production CSS. Smoothness remains visual QA.
const build = basename(process.env.DESERT_CATALOG_BUILD ?? "default");

test("search capsule grows without a reveal mask and reduced motion removes interpolation", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await setSearchPreferences(page, false); await openDestination(page, "Landmarks");
    const samples = await page.evaluateHandle(() => {
      const state = { running: true, frames: [] as { time: number; width: number; pillWidth: number; clip: string; active: boolean; overflow: number }[] };
      const start = performance.now();
      function frame() {
        const field = document.querySelector("[data-catalog-search]")!, workspace = document.querySelector("[data-catalog-workspace]")!;
        state.frames.push({ time: performance.now() - start, width: field.getBoundingClientRect().width,
          pillWidth: field.querySelector('[data-slot="input-group"]')!.getBoundingClientRect().width, clip: getComputedStyle(field).clipPath,
          active: workspace.getAttribute("data-search-active") === "true", overflow: document.documentElement.scrollWidth - innerWidth });
        if (state.running) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame); return state;
    });
    await toolbar(page).getByRole("button", { name: "Search", exact: true }).click();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    assert.ok(await searchInput(page).evaluate(element => document.activeElement === element), "Typing does not wait for animation completion");
    await settle(page);
    const frames = await samples.evaluate(state => { state.running = false; return state.frames; });
    const active = frames.filter(frame => frame.active), final = active.at(-1)!.width;
    assert.ok(frames.every(frame => Math.abs(frame.width - final) < 1), "Opening never moves the surrounding rail");
    assert.ok(active.every(frame => frame.clip === 'none'), "No clipping mask uncovers the field");
    assert.ok(new Set(active.map(frame => Math.round(frame.pillWidth))).size > 2, "The whole rounded capsule grows");
    assert.ok(frames.every(frame => frame.overflow <= 0), "No animation frame creates horizontal page overflow");
    assert.ok(active.at(-1)!.time - active[0]!.time < 600, "A toolbar transition settles promptly, not as a page-length reveal");
    const easing = await toolbar(page).locator("[data-catalog-search]").evaluate(element => getComputedStyle(element).transitionTimingFunction);
    assert.notEqual(easing, "linear", "Spatial expansion uses an eased transition");
    await evidence(page, `search-motion-${build}`, { frames, easing });
    await cancelSearch(page).click(); await settle(page); await setSearchPreferences(page, true);
    await enterSearch(page, true); await assertReducedMotion(page);
    assert.ok(await searchInput(page).evaluate(element => document.activeElement === element));
  } finally { await fixture.close(); }
});

test("keyboard focus outline is actually painted instead of clipped by the expanding field", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await openDestination(page, "Landmarks"); await enterSearch(page, true);
    for (const width of [1100, 390]) {
      await page.setViewportSize({ width, height: 740 });
      // Media-query events can follow resize/animation readiness. Measure only
      // after the provider has committed the intended responsive layout.
      await page.locator(`[data-slot="sidebar-wrapper"][data-presentation="${width < 960 ? "overlay" : "docked"}"]`).waitFor({ state: "attached" });
      await settle(page);
      const group = toolbar(page).locator('[data-slot="input-group"]');
      const state = await group.evaluate(element => {
        const style = getComputedStyle(element), rect = element.getBoundingClientRect();
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, offset: style.outlineOffset, color: style.outlineColor,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
      });
      assert.ok(state.width > 0 && state.style !== "none", "Keyboard focus needs a visible bank focus outline");
      const clip = { x: Math.max(0, state.rect.x - 6), y: Math.max(0, state.rect.y - 6),
        width: Math.min(width - Math.max(0, state.rect.x - 6), state.rect.width + 12), height: state.rect.height + 12 };
      const before = await page.screenshot({ clip, caret: "hide", animations: "disabled",
        path: new URL(`../../artifacts/public-catalog-benchmark/search-ring-before-${width}-${build}.png`, import.meta.url).pathname });
      const previous = await group.evaluate(element => { const node = element as HTMLElement;
        const value = node.style.outline; node.style.outline = "none"; return value; });
      let after: Buffer;
      try { after = await page.screenshot({ clip, caret: "hide", animations: "disabled",
        path: new URL(`../../artifacts/public-catalog-benchmark/search-ring-without-${width}-${build}.png`, import.meta.url).pathname }); }
      finally { await group.evaluate((element, value) => (element as HTMLElement).style.outline = value, previous); }
      await evidence(page, `search-focus-outline-${width}-${build}`, state);
      assert.equal(before.equals(after!), false, "Removing the focus outline must change real paint; a fully clipped ring is invisible");
    }
  } finally { await fixture.close(); }
});
