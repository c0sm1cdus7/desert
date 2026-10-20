import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction } from "./public-catalog-expectations.ts";

for (const colorScheme of ["light", "dark"] as const) test(`frozen pending action inherits its ordinary icon color (${colorScheme})`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.emulateMedia({ colorScheme, reducedMotion: "no-preference" });
    await (await navigationAction(page, "Component bank")).click();
    await page.getByRole("searchbox", { name: "Find component", exact: true }).fill("action");
    const pending = page.locator('[data-specimen="action:pending"]').getByRole("button");
    const ready = page.locator('[data-specimen="action:ready"]').getByRole("button");
    const directory = "artifacts/icon-spin/frozen";
    await mkdir(directory, { recursive: true });
    const evidence = [];
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await pending.scrollIntoViewIfNeeded();
      const appearance = await pending.evaluate(button => {
        const icon = getComputedStyle(button.querySelector("svg")!);
        const owner = getComputedStyle(button);
        return { color: owner.color, iconColor: icon.color, stroke: icon.stroke,
          animation: icon.animationName, duration: icon.animationDuration, iterations: icon.animationIterationCount,
          buttonAnimation: owner.animationName, busy: button.getAttribute("aria-busy") };
      });
      assert.equal(appearance.iconColor, appearance.color);
      assert.equal(appearance.stroke, appearance.color);
      assert.notEqual(appearance.animation, "none");
      assert.ok(parseFloat(appearance.duration) > 0);
      assert.equal(appearance.iterations, "infinite");
      assert.equal(appearance.buttonAnimation, "none");
      assert.equal(appearance.busy, "true");
      assert.equal(await pending.isDisabled(), true);
      const readyBox = (await ready.boundingBox())!, busyBox = (await pending.boundingBox())!;
      assert.equal(readyBox.width, busyBox.width);
      assert.equal(readyBox.height, busyBox.height);
      evidence.push({ width, ...appearance });
      await page.screenshot({ path: `${directory}/${colorScheme}-${width}.png` });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await pending.locator("svg").evaluate(icon => getComputedStyle(icon).animationName), "none");
    assert.equal(await pending.getAttribute("aria-busy"), "true");
    assert.equal(await pending.locator("svg").isVisible(), true);
    await writeFile(`${directory}/${colorScheme}.json`, JSON.stringify(evidence, null, 2));
    f.diagnostics.assertClean();
  } finally { await f.close(); }
});
