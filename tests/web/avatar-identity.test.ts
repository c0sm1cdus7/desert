import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";
import { avatarEvidence, avatarGeometry, avatarViolations } from "./avatar-identity-expectations.ts";

test("bank avatars retain a visible identity face and readable label at narrow width and 200 percent text", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture(), failures: string[] = [];
  try {
    await (await navigationAction(f.page, "Component bank")).click();
    await f.page.getByRole("searchbox", { name: "Find component", exact: true }).fill("avatar");
    for (const width of [1280, 320]) for (const scale of [1, 2]) {
      await f.page.setViewportSize({ width, height: 844 });
      await f.page.evaluate(scale => document.documentElement.style.setProperty("--text-scale", String(scale)), scale);
      await settle(f.page);
      for (const state of ["image", "fallback"] as const) {
        const specimen = f.page.locator(`[data-view-item="specimen:control.avatar:${state}"]`);
        const row = specimen.locator('[data-control="avatar"]');
        await row.scrollIntoViewIfNeeded();
        if (state === "image") await row.locator("img").waitFor();
        const geometry = await avatarGeometry(row), violations = avatarViolations(geometry, state === "fallback");
        failures.push(...violations.map(value => `${width}/${scale}/${state}: ${value}`));
        await avatarEvidence(f.page, `${width}-scale-${scale}-${state}`, { geometry, violations }, specimen);
      }
    }
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("failed avatar images preserve the same bounded fallback and recover when the source loads", { timeout: 30000 }, async () => {
  const f = await publicCatalogFixture();
  try {
    // Successful HTTP with invalid image data exercises the native image failure
    // path without manufacturing unrelated HTTP/console/request diagnostics.
    await f.page.route("**/bank-image.svg", route => route.fulfill({ status: 200, contentType: "image/svg+xml", body: "not an image" }));
    await (await navigationAction(f.page, "Component bank")).click();
    await f.page.getByRole("searchbox", { name: "Find component", exact: true }).fill("avatar");
    const specimen = f.page.locator('[data-view-item="specimen:control.avatar:image"]');
    const row = specimen.locator('[data-control="avatar"]');
    await row.getByText("AR", { exact: true }).waitFor(); await row.scrollIntoViewIfNeeded(); await settle(f.page);
    const failedGeometry = await avatarGeometry(row), violations = avatarViolations(failedGeometry, true);
    await avatarEvidence(f.page, "failed-image", { geometry: failedGeometry, violations }, specimen);
    await f.page.unroute("**/bank-image.svg");
    await f.page.reload(); await (await navigationAction(f.page, "Component bank")).click();
    await f.page.getByRole("searchbox", { name: "Find component", exact: true }).fill("avatar");
    await row.locator("img").waitFor();
    assert.ok(await row.locator("img").evaluate(image => (image as HTMLImageElement).naturalWidth > 0));
    assert.equal(await row.getByText("AR", { exact: true }).isVisible(), false, "fallback does not overlay a loaded image");
    assert.deepEqual(violations, []);
  } finally { await f.close(); }
});

test("Travel kit inspiration does not fabricate a person identity for the trip", { timeout: 30000 }, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 1280, height: 1000 });
    await (await navigationAction(f.page, "Travel kit")).click();
    const section = f.page.locator('[data-exercise-section="inspiration"]');
    await section.waitFor(); await section.scrollIntoViewIfNeeded(); await settle(f.page);
    const avatarCount = await section.locator('[data-control="avatar"]').count();
    await avatarEvidence(f.page, "travel-inspiration", { avatarCount, text: await section.innerText() }, section);
    assert.equal(avatarCount, 0, "a trip is not a person; Avatar remains demonstrated in its dedicated bank specimens");
    assert.equal(await section.getByText("Your trip", { exact: true }).count(), 0);
    assert.ok(await section.getByText("Mount Fuji", { exact: true }).isVisible());
  } finally { await f.close(); }
});
