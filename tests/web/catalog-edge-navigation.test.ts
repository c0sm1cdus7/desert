import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, box, settle } from "./public-catalog-expectations.ts";

// Direct manipulation is observable before release. A canceled, vertical or
// insufficient drag must not navigate. Buttons remain the accessible alternative.
test("edge drag previews the actual sidebar, cancels, then opens on release", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 }); await settle(f.page);
    const nav = f.page.locator('[data-sidebar="sidebar"][data-presentation="overlay"]');
    await f.page.mouse.move(3, 200); await f.page.mouse.down();
    await f.page.mouse.move(70, 200, { steps: 8 });
    assert.equal(await nav.isVisible(), true, "Panel must follow the pointer before release");
    const preview = await box(nav);
    assert.ok(preview.x < 0 && preview.x + preview.width > 40, "Only the dragged portion is revealed");
    assert.equal(await action(f.page, "Show navigation").getAttribute("aria-expanded"), "false");
    await f.page.mouse.up(); await nav.waitFor({ state: "hidden" });
    await f.page.mouse.move(3, 200); await f.page.mouse.down();
    await f.page.mouse.move(220, 200, { steps: 12 });
    await f.page.mouse.up(); await settle(f.page);
    await action(f.page, "Hide navigation").waitFor();
    assert.ok((await box(nav)).x >= 8);
    assert.equal(await action(f.page, "Hide navigation").getAttribute("aria-expanded"), "true");
    const header = await box(f.page.locator("[data-navigation-drag]"));
    await f.page.mouse.move(header.x + header.width - 20, header.y + header.height / 2); await f.page.mouse.down();
    await f.page.mouse.move(header.x + 30, header.y + header.height / 2, { steps: 12 });
    assert.ok((await box(nav)).x < 0, "Open sidebar also follows a dismiss drag");
    await f.page.mouse.up(); await nav.waitFor({ state: "hidden" });
    await f.page.mouse.move(3, 200); await f.page.mouse.down();
    await f.page.mouse.move(12, 310, { steps: 8 }); await f.page.mouse.up();
    assert.equal(await nav.isVisible(), false, "Vertical intent never reveals navigation");
  } finally { await f.close(); }
});

test("collapsed desktop sidebar supports the same edge reveal", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 1200, height: 800 });
    await action(f.page, "Hide navigation").click(); await settle(f.page);
    await f.page.mouse.move(3, 200); await f.page.mouse.down();
    await f.page.mouse.move(90, 200, { steps: 8 });
    const panel = f.page.locator('[data-slot="sidebar-container"]');
    const preview = await box(panel);
    assert.ok(preview.x < 0 && preview.x + preview.width > 50);
    await f.page.mouse.move(240, 200, { steps: 8 }); await f.page.mouse.up(); await settle(f.page);
    await action(f.page, "Hide navigation").waitFor();
    assert.ok((await box(panel)).x >= 0);
  } finally { await f.close(); }
});

test("detail edge drag has live feedback and commits Back only when released", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await action(f.page, "Learn More").click(); await settle(f.page);
    const detail = f.page.locator("[data-catalog-detail-title]");
    const before = await box(detail);
    await f.page.mouse.move(3, 220); await f.page.mouse.down();
    await f.page.mouse.move(65, 220, { steps: 8 });
    assert.ok((await box(detail)).x > before.x + 30, "Detail follows the drag");
    await f.page.mouse.up(); await settle(f.page);
    assert.ok(Math.abs((await box(detail)).x - before.x) < 1, "Short drag restores the detail");
    await f.page.mouse.move(3, 220); await f.page.mouse.down();
    await f.page.mouse.move(200, 220, { steps: 12 });
    assert.equal(await detail.isVisible(), true, "No premature navigation while held");
    await f.page.mouse.up(); await action(f.page, "Learn More").waitFor(); await settle(f.page);
    assert.equal(await action(f.page, "Back").isVisible(), false);
    assert.equal(await f.page.getByRole("dialog", { name: "Navigation", exact: true }).isVisible(), false);
  } finally { await f.close(); }
});
