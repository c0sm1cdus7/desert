import assert from "node:assert/strict";
import test from "node:test";
import { basename } from "node:path";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { settle, evidence } from "./public-catalog-expectations.ts";

// Centered messages travel vertically, without scaling their reading geometry.
// Scrubbing real CSS animations makes the path reproducible, not frame-rate dependent.
test("message dialog opens and closes on a vertical axis with stable text geometry", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page, origin } = fixture;
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`${origin}/?place=bank`);
    await settle(page);
    await page.getByRole("button", { name: "Open problem example", exact: true }).first().click();
    const dialog = page.locator('[data-slot="dialog-content"].problem');
    await dialog.waitFor();
    const paths = await dialog.evaluate(element => {
      const samples: { phase: string; x: number; y: number; width: number; height: number }[] = [];
      for (const phase of ["open", "closed"]) {
        element.setAttribute("data-state", phase);
        void getComputedStyle(element).animationName;
        const animations = element.getAnimations();
        if (!animations.length) throw new Error(`Missing ${phase} motion`);
        for (const animation of animations) animation.pause();
        for (const fraction of [0, .2, .5, .8, .99]) {
          for (const animation of animations) animation.currentTime = Number(animation.effect!.getTiming().duration) * fraction;
          const { x, y, width, height } = element.getBoundingClientRect();
          samples.push({ phase, x, y, width, height });
        }
      }
      return samples;
    });
    await evidence(page, `dialog-vertical-motion-${basename(process.env.DESERT_CATALOG_BUILD ?? "default")}`, paths);
    for (const phase of ["open", "closed"]) {
      const samples = paths.filter(sample => sample.phase === phase), first = samples[0]!;
      assert.ok(samples.every(sample => Math.abs(sample.x - first.x) < .25), `${phase}: no diagonal drift`);
      assert.ok(samples.every(sample => Math.abs(sample.width - first.width) < .25 && Math.abs(sample.height - first.height) < .25), `${phase}: no text scaling`);
      assert.ok(Math.abs(samples.at(-1)!.y - first.y) > 4, `${phase}: visible vertical movement`);
    }
  } finally { await fixture.close(); }
});
