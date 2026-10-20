import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { settle } from "./public-catalog-expectations.ts";
import { saveWellEvidence, selectionWell, wellAppearance, wellPoints } from "./field-well-expectations.ts";

// Independent expectations written before the whole-well implementation. The
// visible well is the native select trigger, not a div that forwards clicks.
for (const location of ["bank", "travel"] as const) test(`${location}: every well region activates the same native select`, async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture; await page.setViewportSize({ width: 1280, height: 900 });
    const { trigger, well } = await selectionWell(page, location), menu = page.getByRole("listbox");
    const observations = [], problems: string[] = [];
    for (const [name, point] of Object.entries(await wellPoints(well))) {
      await page.mouse.click(point.x, point.y); await settle(page);
      const opened = await menu.isVisible(); observations.push({ name, point, opened });
      if (!opened) problems.push(`${name} did not open the selection`);
      if (opened) { await page.keyboard.press("Escape"); await menu.waitFor({ state: "hidden" }); }
    }
    const appearance = await wellAppearance(well);
    if (!appearance.interactive) problems.push("The whole well is not the native button owning selection semantics");
    assert.equal(await trigger.count(), 1, "One selection has one keyboard target");
    await saveWellEvidence(page, `${location}-hit-target`, { observations, appearance, problems });
    assert.deepEqual(problems, []);
  } finally { await fixture.close(); }
});

for (const location of ["bank", "travel"] as const) test(`${location}: whole-well hover and press share one feedback plane`, async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture; await page.setViewportSize({ width: 1280, height: 900 });
    const { well } = await selectionWell(page, location), point = (await wellPoints(well)).value;
    await page.mouse.move(0, 0); await settle(page); const rest = await wellAppearance(well);
    await page.mouse.move(point.x, point.y); await settle(page); const hover = await wellAppearance(well);
    await page.mouse.down();
    try {
      await settle(page); const held = await wellAppearance(well);
      const problems: string[] = [];
      if (hover.background === rest.background && hover.image === rest.image) problems.push("Hover never reaches the well surface");
      if (held.background === hover.background && held.image === hover.image) problems.push("Press never reaches the well surface");
      if (held.transform !== "none") problems.push("The well itself must remain stable while its contents compress");
      for (const dimension of ["x", "y", "width", "height"] as const)
        if (Math.abs(rest.box[dimension] - held.box[dimension]) > .1) problems.push(`Press changes well ${dimension}`);
      if (held.innerPaint.some(child => child.image !== "none")) problems.push("A nested content/input plane paints a second feedback treatment");
      await saveWellEvidence(page, `${location}-feedback`, { rest, hover, held, problems });
      assert.deepEqual(problems, []);
    } finally { await page.mouse.move(0, 0); await page.mouse.up(); }
  } finally { await fixture.close(); }
});
