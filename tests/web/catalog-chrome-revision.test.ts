import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, box, settle } from "./public-catalog-expectations.ts";

// Owner's 2026-10-16 corrections, recorded before implementation:
// rich imagery continues behind the floating sidebar's outer inset; disclosure
// is top-trailing with settings bottom-trailing; navigation is separate from developer tools;
// compact Back is top-leading while search stays at the bottom.
// Owner decision V1 (2026-10-25) withdraws the coloured destination identities of 2026-10-16: a destination's icon is
// the one Face (law 9e), white ground and hairline on every destination, its colour on the glyph alone
// (tests/navigation-face.test.ts measures the primitive on the shell; this checks the built product shows it).
test("hero extends through the sidebar inset; navigation is grouped, its destinations wear the one face", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 1200, height: 800 }); await settle(f.page);
    const coverage = await f.page.locator("[data-catalog-content] > [data-place-header] [data-place-media]").first().evaluate(element => {
      const style = getComputedStyle(element), r = element.getBoundingClientRect();
      return { top: r.top, left: r.left, clip: style.clipPath };
    });
    assert.equal(coverage.top, 0); assert.equal(coverage.left, 0);
    assert.equal(coverage.clip, "none", "Do not clip imagery at the rounded sidebar silhouette");
    assert.equal(await f.page.locator('[data-catalog-navigation] [data-slot="sidebar-group"]').count(), 2);
    const faces = await f.page.locator("[data-navigation-icon]").evaluateAll(elements => {
      const probe = document.createElement("i"); probe.style.color = "var(--card-base)"; document.body.append(probe);
      const ground = getComputedStyle(probe).color; probe.remove();
      return elements.map(slot => { const face = slot.firstElementChild!; return { slot: getComputedStyle(slot).backgroundColor, children: slot.children.length,
        piece: face.getAttribute("data-piece"), ground: getComputedStyle(face).backgroundColor, white: ground,
        hairline: getComputedStyle(face, "::after").borderTopWidth, glyph: getComputedStyle(face.querySelector("[data-face-content]")!).color }; });
    });
    assert.ok(faces.length >= 2, "every destination has its icon");
    for (const face of faces) {
      assert.equal(face.children, 1); assert.equal(face.piece, "face", "the destination's icon is the Face foundation, not a drawing of the shell's");
      assert.equal(face.slot, "rgba(0, 0, 0, 0)", "the shell paints no coloured square behind the face");
      assert.equal(face.ground, face.white, "the face's ground is the card white (law 9e)");
      assert.equal(face.hairline, "1px", "the face wears the one hairline");
    }
    assert.equal(new Set(faces.map(face => face.ground)).size, 1, "every destination face shares the one ground; only the glyph may differ");
  } finally { await f.close(); }
});

test("sidebar toggle and settings share aligned top/bottom toolbars", async () => {
  const f = await publicCatalogFixture();
  try {
    for (const width of [1200, 390]) {
      await f.page.setViewportSize({ width, height: 844 }); await settle(f.page);
      if (width === 390) await action(f.page, "Show navigation").click();
      await settle(f.page);
      const panel = await box(f.page.locator(width === 390 ? '[data-sidebar="sidebar"][data-presentation="overlay"]' : '[data-slot="sidebar-inner"]'));
      const toggle = await box(action(f.page, "Hide navigation"));
      assert.ok(toggle.x > panel.x + panel.width / 2, "Toggle belongs on the right of the sidebar title");
      assert.ok(panel.x + panel.width - toggle.x - toggle.width >= 8);
      assert.ok(toggle.y < panel.y + 70);
      const settings = await box(action(f.page, "Settings"));
      assert.ok(settings.y > panel.y + panel.height * .8);
      assert.ok(Math.abs(settings.x + settings.width - toggle.x - toggle.width) < 2);
    }
  } finally { await f.close(); }
});

test("compact Back remains top-leading while Search remains below", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await action(f.page, "Learn More").click(); await settle(f.page);
    const back = await box(action(f.page, "Back")), search = await box(action(f.page, "Search"));
    assert.ok(back.x < 70 && back.y < 70, "Back must not share the bottom action bar");
    assert.ok(back.width >= 44 && back.height >= 44);
    assert.ok(search.y > 740, "Search stays in thumb reach");
    await action(f.page, "Search").click(); await settle(f.page);
    assert.equal(await action(f.page, "Back").count(), 0, "Search excludes retained navigation from accessibility ownership");
    assert.equal(await f.page.locator('[data-catalog-content] > [data-place-header]').evaluate(node => node.hasAttribute('inert')), true);
  } finally { await f.close(); }
});

test("edge gestures do not intercept visible navigation button targets", async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 }); await settle(f.page);
    const disclosure = action(f.page, "Show navigation");
    await disclosure.click({ position: { x: 2, y: 22 } });
    await action(f.page, "Hide navigation").click(); await settle(f.page);
    await action(f.page, "Learn More").click(); await settle(f.page);
    await action(f.page, "Back").click({ position: { x: 2, y: 22 } });
    await action(f.page, "Learn More").waitFor();
  } finally { await f.close(); }
});
