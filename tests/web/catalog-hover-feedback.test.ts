import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { Locator, Page } from "playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, settle } from "./public-catalog-expectations.ts";

// Independent expectations recorded before the repair, 2026-10-16:
// enabled action surfaces visibly respond to hover and distinctly while held;
// semantic material and hit geometry remain fixed, and moving outside cancels.
// Text-entry wells share hover/focus, but do not pretend to be pressed actions.
const flows = ["search", "close-search", "clear-search", "back", "input-group",
  "selected-navigation", "unselected-navigation"] as const;
type Flow = typeof flows[number];
const build = basename(process.env.DESERT_CATALOG_BUILD ?? "unknown-build");
const directory = resolve("artifacts/hover-consistency", process.env.DESERT_HOVER_PHASE ?? build);

async function target(page: Page, flow: Flow) {
  if (flow === "selected-navigation" || flow === "unselected-navigation") {
    const state = flow === "selected-navigation" ? '[data-active="true"]' : ':not([data-active="true"])';
    return page.locator(`[data-catalog-navigation] [data-slot="sidebar-menu-button"]${state}:visible`).first();
  }
  if (flow === "back") { await action(page, "Learn More").click(); await settle(page); return action(page, "Back"); }
  if (flow === "search") return action(page, "Search");
  await action(page, "Search").click(); await settle(page);
  if (flow === "close-search") return action(page, "Close search");
  if (flow === "input-group") return page.locator('[data-catalog-search] [data-slot="input-group"]');
  await page.getByRole("searchbox").fill("Ar"); await settle(page);
  return action(page, "Clear search");
}

async function sample(page: Page, control: Locator, name: string) {
  const measured = await control.evaluate(element => {
    const s = getComputedStyle(element), r = element.getBoundingClientRect();
    const content = element.querySelector("[data-button-content]");
    return { box: { x: r.x, y: r.y, width: r.width, height: r.height },
      material: { background: s.backgroundColor, backdrop: s.backdropFilter, shadow: s.boxShadow },
      overlay: s.backgroundImage, color: s.color, transform: s.transform,
      contentTransform: content ? getComputedStyle(content).transform : null,
      pressed: element.getAttribute("data-pressed"), focused: element.matches(":focus-visible") };
  });
  // A blank interior patch checks actual composited paint. The 28px Clear
  // control needs a narrower inset to exclude its glyph and antialiasing.
  const { box } = measured;
  const patch = { x: box.x + (box.width <= 30 ? 2 : 4), y: box.y + box.height / 2 - 1, width: 2, height: 2 };
  const png = await page.screenshot({ clip: patch,
    animations: "disabled", caret: "hide" });
  await control.screenshot({ path: resolve(directory, `${name}.png`), animations: "disabled", caret: "hide" });
  return { ...measured, patch, paint: createHash("sha256").update(png).digest("hex") };
}

for (const theme of ["light", "dark"] as const) for (const flow of flows) {
  test(`${theme}: ${flow} keeps visible hover and held feedback on its own surface`, { timeout: 30000 }, async () => {
    const f = await publicCatalogFixture();
    const name = `${build}-${theme}-${flow}`;
    try {
      await mkdir(directory, { recursive: true });
      await f.page.setViewportSize({ width: 1100, height: 760 });
      await f.page.emulateMedia({ colorScheme: theme }); await settle(f.page);
      const control = await target(f.page, flow);
      await control.waitFor({ state: "visible" }); await control.scrollIntoViewIfNeeded(); await settle(f.page);
      await f.page.mouse.move(1090, 740); await settle(f.page);
      const normal = await sample(f.page, control, `${name}-normal`);
      await control.hover(); await settle(f.page);
      const hover = await sample(f.page, control, `${name}-hover`);
      let held: Awaited<ReturnType<typeof sample>> | undefined;
      if (flow !== "input-group") {
        await f.page.mouse.down(); await settle(f.page);
        held = await sample(f.page, control, `${name}-held`);
      }
      await f.page.mouse.move(1090, 740); await settle(f.page);
      const cancelled = await sample(f.page, control, `${name}-cancelled`);
      await f.page.mouse.up();
      // Persist every state before asserting: a missing hover must not erase
      // evidence of the independent press, material, geometry or cancellation.
      const states = { normal, hover, held, cancelled };
      const failures: string[] = [];
      const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };
      expect(hover.paint !== normal.paint, "hover must visibly change the blank interior surface");
      if (held) expect(held.paint !== hover.paint, "held must visibly differ from hover");
      for (const [state, value] of Object.entries(states)) if (value) {
        expect(JSON.stringify(value.box) === JSON.stringify(normal.box), `${state}: hit footprint must not move`);
        expect(JSON.stringify(value.material) === JSON.stringify(normal.material), `${state}: base material must remain unchanged`);
        expect(value.color === normal.color, `${state}: semantic foreground must remain unchanged`);
        expect(value.transform === "none", `${state}: interactive container must not transform`);
      }
      expect(cancelled.paint === normal.paint, "moving outside must restore the normal visible surface");
      expect(cancelled.pressed === null, "moving outside must clear the held marker");
      expect(cancelled.contentTransform === normal.contentTransform, "moving outside must restore content geometry");
      await writeFile(resolve(directory, `${name}.json`), JSON.stringify({ build, theme, flow, states, failures }, null, 2) + "\n");
      assert.deepEqual(failures, [], `${theme}/${flow}: ${failures.join("; ")}`);
    } finally { await f.page.mouse.up().catch(() => {}); await f.close(); }
  });
}
