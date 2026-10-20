import assert from "node:assert/strict";
import test from "node:test";
import { basename } from "node:path";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, evidence, search, settle } from "./public-catalog-expectations.ts";

test("one continuous media belongs to the visible place and survives sibling presentation changes", async () => {
  const app = await publicCatalogFixture();
  try {
    const { page, context } = app;
    await page.setViewportSize({ width: 1280, height: 900 });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-reduced-transparency", value: "no-preference" },
      { name: "prefers-contrast", value: "no-preference" },
    ] });
    const extension = page.locator("[data-catalog-background-extension]");
    const decoration = page.locator("[data-catalog-material-edge], [data-catalog-underlay]");
    const states: Record<string, unknown>[] = [];
    async function expectNoHero(destination: string) {
      // Removal, not CSS hiding: accessibility preferences must not mask residue.
      await extension.waitFor({ state: "detached" });
      assert.equal(await decoration.count(), 0, `${destination}: no orphaned image decoration`);
      assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches), false);
      states.push({ destination, extension: 0, edge: 0 });
    }
    async function expectCurrentHero(selector: string) {
      assert.equal(await extension.count(), 0, 'There is no separately loaded mirrored media');
      const image = page.locator(selector).filter({ visible: true });
      const current = await image.getAttribute("src");
      assert.ok(current);
      const bounds = (await image.boundingBox())!;
      assert.equal(bounds.x, 0); assert.equal(bounds.width, 1280);
      return current;
    }
    const home = await expectCurrentHero("[data-public-hero] img");
    await page.locator("[data-catalog-scroll]").evaluate(element => element.scrollTop = 160); await settle(page);
    const heroTop = (await page.locator("[data-public-hero] img").boundingBox())!.y;
    assert.equal(heroTop, -160, "The single media scrolls naturally with its place");
    const original = await page.locator('[data-public-hero] img').first().elementHandle();
    await page.getByRole("button", { name: /^(Hide|Toggle) navigation$/ }).first().click();
    await settle(page); assert.equal(await expectCurrentHero('[data-public-hero] img'), home);
    await action(page, "Show navigation").click(); await settle(page);
    assert.equal(await expectCurrentHero("[data-public-hero] img"), home);
    assert.ok(await page.locator('[data-public-hero] img').first().evaluate((node, previous) => node === previous, original));
    await action(page, "Component bank").click();
    await expectNoHero("bank from home");
    const build = basename(process.env.DESERT_CATALOG_BUILD ?? "default");
    await evidence(page, `background-lifecycle-bank-${build}`, states);
    await action(page, "Travel kit").click();
    await expectNoHero("travel kit from bank");
    await action(page, "Landmarks").click();
    assert.equal(await expectCurrentHero("[data-public-hero] img"), home);
    await action(page, "South Shetland Islands").click();
    assert.notEqual(await expectCurrentHero("[data-catalog-detail-image] img"), home);
    await action(page, "Component bank").click();
    await expectNoHero("bank from detail");
    await action(page, "Landmarks").click();
    await (await search(page)).fill("Fuji");
    assert.equal(await expectCurrentHero("[data-public-hero] img"), home, "Glass search retains the current page image");
    await (await search(page)).fill("no-matching-landmark");
    assert.equal(await expectCurrentHero("[data-public-hero] img"), home, "Zero results retain the same glass context");
    await (await search(page)).fill("");
    await page.getByRole("heading", { name: "Search in Landmarks", exact: true }).waitFor();
    await page.getByRole("button", { name: /^(Close|Cancel) search$/ }).click();
    assert.equal(await expectCurrentHero("[data-public-hero] img"), home);
    await evidence(page, `background-lifecycle-home-${build}`, states);
  } finally { await app.close(); }
});
