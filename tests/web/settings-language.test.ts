import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, selectionTrigger, settle } from "./public-catalog-expectations.ts";
import { assertExposed, assertReducedMotion, enterSearch, searchInput, toolbar } from "./public-search-mode-helpers.ts";
import { settingsEvidence, settingsExpectations as expected, settingsGroupPaint } from "./settings-language-expectations.ts";

test("Settings hierarchy groups sibling bank states into one quiet surface", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture(), failures: string[] = [];
  try {
    await f.page.setViewportSize(expected.desktop);
    await (await navigationAction(f.page, "Component bank")).click();
    for (const id of ["input.text", "control.avatar"]) {
      const group = f.page.locator(`[data-catalog-entry="${id}"]`);
      await group.scrollIntoViewIfNeeded(); await settle(f.page);
      const paint = await settingsGroupPaint(group);
      await settingsEvidence(f.page, `group-${id}`, paint, group);
      if (!paint.states.length || !paint.sameParent || !paint.shared) failures.push(`${id}: missing shared state group`);
      else {
        if (paint.shared.background === "rgba(0, 0, 0, 0)" || paint.shared.radius <= 0)
          failures.push(`${id}: sibling states lack a single rounded containing surface`);
        for (const state of paint.states) {
          if (state.border.every(value => value > 0) || state.shadow !== "none")
            failures.push(`${state.id}: state is still independently framed`);
        }
        if (paint.blurredContent.length) failures.push(`${id}: content uses glass ${paint.blurredContent.join(",")}`);
      }
    }
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("desktop navigation keeps readable selected destinations and a current-view toolbar title", { timeout: 30000 }, async () => {
  const f = await publicCatalogFixture(), failures: string[] = [];
  try {
    await f.page.setViewportSize(expected.desktop);
    for (const destination of ["Travel kit", "Component bank"]) {
      await (await navigationAction(f.page, destination)).click(); await settle(f.page);
      const nav = f.page.getByRole("navigation", { name: "Main navigation", exact: true });
      const rows = await nav.getByRole("button").evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect();
        return { text: node.textContent?.trim(), selected: node.getAttribute("aria-current"),
          width: r.width, scroll: node.scrollWidth, client: node.clientWidth, background: getComputedStyle(node).backgroundColor };
      }));
      const heading = await toolbar(f.page).innerText();
      await settingsEvidence(f.page, `desktop-${destination.replaceAll(" ", "-")}`, { rows, heading });
      if (!heading.includes(destination)) failures.push(`${destination}: missing current-view title in toolbar`);
      assert.equal(rows.filter(row => row.selected === "page").length, 1);
      assert.equal(rows.find(row => row.selected === "page")?.text, destination);
      assert.ok(rows.every(row => row.scroll <= row.client + 1), "Destination labels fit without clipping");
      const selected = rows.find(row => row.selected === "page")!;
      assert.ok(rows.filter(row => row.selected !== "page").every(row => row.background !== selected.background));
    }
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("compact tools stay at the bottom and exclusive search preserves full-width typing", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture();
  try {
    for (const width of expected.compact.widths) {
      await f.page.setViewportSize({ width, height: expected.compact.height });
      await (await navigationAction(f.page, "Travel kit")).click();
      await settle(f.page);
      // Dialog teardown releases its body pointer lock after CSS animations finish.
      await f.page.waitForFunction(() => getComputedStyle(document.body).pointerEvents !== "none", undefined, { timeout: 2000 });
      const bar = (await toolbar(f.page).boundingBox())!;
      assert.ok(bar.y > expected.compact.height * .75 && bar.y + bar.height <= expected.compact.height);
      for (const name of ["Show navigation", "Search"]) {
        // The bottom navigation opener is independent of the place toolbar.
        const control = f.page.getByRole("button", { name, exact: true });
        await assertExposed(control); const box = (await control.boundingBox())!;
        assert.ok(box.width >= 44 && box.height >= 44, `${name} is a touch target`);
      }
      await enterSearch(f.page);
      const close = toolbar(f.page).getByRole("button", { name: "Close search", exact: true });
      await assertExposed(close); await assertExposed(searchInput(f.page));
      assert.equal(await f.page.getByRole("button", { name: "Show navigation", exact: true }).count(), 0);
      const field = (await toolbar(f.page).locator('[data-slot="input-group"]').boundingBox())!;
      const closeBox = (await close.boundingBox())!;
      assert.ok(field.width >= bar.width - closeBox.width - 20, "Expanded field consumes remaining tool space");
      const type = await searchInput(f.page).evaluate(node => parseFloat(getComputedStyle(node).fontSize));
      assert.ok(type >= expected.compact.minimumBody);
      await settingsEvidence(f.page, `compact-${width}`, { bar, field, closeBox, type });
      await close.click();
    }
  } finally { await f.close(); }
});

test("quiet Travel kit retains enclosed, accessible whole-well entry without outlined section cards", { timeout: 30000 }, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize(expected.desktop);
    await (await navigationAction(f.page, "Travel kit")).click();
    const sections = await f.page.locator("[data-exercise-section]").evaluateAll(nodes => nodes.map(node => {
      const s = getComputedStyle(node); return { id: node.getAttribute("data-exercise-section"),
        border: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(parseFloat), shadow: s.boxShadow };
    }));
    const name = f.page.getByRole("textbox", { name: "Trip name", exact: true });
    await name.fill("Quiet hierarchy witness");
    const well = name.locator("xpath=ancestor::*[@data-floating-field][1]");
    const wellBox = (await well.boundingBox())!, inputBox = (await name.boundingBox())!;
    assert.ok(wellBox.height > inputBox.height, "Caption and value are enclosed by one well");
    assert.equal(await name.inputValue(), "Quiet hierarchy witness");
    const destination = selectionTrigger(f.page, "Destination");
    await destination.click({ position: { x: 10, y: 10 } });
    await f.page.getByRole("option", { name: "Mount Fuji", exact: true }).click();
    assert.match((await destination.innerText()), /Mount Fuji/);
    await settingsEvidence(f.page, "travel-wells", { sections, wellBox, inputBox });
    assert.ok(sections.every(section => !section.border.every(value => value > 0) && section.shadow === "none"),
      "Content sections use tonal grouping rather than separate outlined cards");
  } finally { await f.close(); }
});

test("Settings surface follows appearance and keeps accessibility preferences authoritative", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize(expected.desktop);
    await (await navigationAction(f.page, "Travel kit")).click();
    const appearances = [];
    for (const scheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme: scheme }); await settle(f.page);
      const appearance = await f.page.locator("[data-catalog-workspace]").evaluate(node => {
        const style = getComputedStyle(node), canvas = document.createElement("canvas").getContext("2d")!;
        canvas.fillStyle = style.backgroundColor; canvas.fillRect(0, 0, 1, 1);
        const [r, g, b] = canvas.getImageData(0, 0, 1, 1).data;
        return { background: style.backgroundColor, luminance: .2126 * r! + .7152 * g! + .0722 * b!, colorScheme: style.colorScheme };
      });
      appearances.push({ scheme, ...appearance });
      await settingsEvidence(f.page, `appearance-${scheme}`, appearance);
    }
    const session = await f.context.newCDPSession(f.page);
    await session.send("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-color-scheme", value: "dark" },
      { name: "prefers-reduced-motion", value: "reduce" },
      { name: "prefers-reduced-transparency", value: "reduce" },
    ] });
    await enterSearch(f.page); await assertReducedMotion(f.page);
    const materials = await f.page.locator('[data-catalog-search-material], [data-catalog-search] [data-slot="input-group"], [data-slot="sidebar-inner"]')
      .evaluateAll(nodes => nodes.map(node => ({ slot: node.getAttribute("data-slot"), backdrop: getComputedStyle(node).backdropFilter })));
    await settingsEvidence(f.page, "system-preferences", { appearances, materials });
    assert.ok(materials.every(material => material.backdrop === "none"), "Reduce transparency removes glass blur");
    assert.ok(appearances[0]!.luminance > 200 && appearances[1]!.luminance < 90,
      `System appearance changes the shared palette: ${JSON.stringify(appearances)}`);
  } finally { await f.close(); }
});

test("compact content type and enlarged wells stay readable without horizontal overflow", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture(), failures: string[] = [];
  try {
    await f.page.setViewportSize({ width: 320, height: 844 });
    await (await navigationAction(f.page, "Travel kit")).click();
    const name = f.page.getByRole("textbox", { name: "Trip name", exact: true });
    await name.fill("An ordinary readable trip");
    for (const scale of [1, 2]) {
      await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      await name.scrollIntoViewIfNeeded(); await settle(f.page);
      const measure = await name.evaluate(node => {
        const style = getComputedStyle(node), r = node.getBoundingClientRect();
        const well = node.closest("[data-floating-field]")!, w = well.getBoundingClientRect();
        const main = document.querySelector("[data-catalog-scroll]")!;
        return { font: parseFloat(style.fontSize), left: r.left, right: r.right, wellLeft: w.left,
          wellRight: w.right, viewport: innerWidth, scrollWidth: main.scrollWidth, clientWidth: main.clientWidth };
      });
      await settingsEvidence(f.page, `compact-content-scale-${scale}`, measure);
      if (measure.font < expected.compact.minimumBody * scale) failures.push(`${scale}x: entry type only ${measure.font}px`);
      if (measure.wellLeft < 0 || measure.wellRight > measure.viewport || measure.scrollWidth > measure.clientWidth + 1)
        failures.push(`${scale}x: compact content overflows horizontally`);
      assert.equal(await name.inputValue(), "An ordinary readable trip");
    }
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});
