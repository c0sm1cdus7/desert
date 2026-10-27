import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";
import { fieldGeometry, geometryProblems, saveFieldEvidence, stressLabel } from "./field-geometry.ts";

test("shared fields align labels and writing in every bank state at compact and enlarged sizes", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture();
  const samples: unknown[] = [], failures: string[] = [];
  try {
    await (await navigationAction(f.page, "Component bank")).click();
    for (const width of [1280, 390, 320]) for (const scale of [1, 1.3, 2]) {
      await f.page.setViewportSize({ width, height: 1000 });
      await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      await settle(f.page);
      for (const kind of ["input.text", "input.multiline"]) for (const state of ["empty", "value", "invalid", "disabled"]) {
        const field = f.page.locator(`[data-view-item="specimen:${kind}:${state}"]`);
        await field.scrollIntoViewIfNeeded();
        const geometry = await fieldGeometry(field);
        const key = `${kind}:${state}/${width}/${scale}`;
        samples.push({ key, geometry });
        failures.push(...geometryProblems(geometry, !!geometry.value).map(problem => `${key}: ${problem}`));
        assert.equal(geometry.disabled, state === "disabled");
        assert.equal(geometry.invalid, String(state === "invalid"));
        assert.equal(geometry.required, true);
        if (!geometry.value && kind === "input.text") {
          // Compact labels own top padding; compare visible glyphs, not the
          // asymmetric layout box. Containment still checks the complete box.
          const offset = Math.abs((geometry.labelGlyphs.top + geometry.labelGlyphs.bottom - geometry.well.top - geometry.well.bottom) / 2);
          if (offset > 1) failures.push(`${key}: Empty single-line label must be vertically centered (${offset}px)`);
        }
      }
    }
    await saveFieldEvidence(f.page, "states", samples, failures);
  } finally { await f.close(); }
});

test("wrapped and unbroken field labels reserve their own space through focus and editing", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture();
  const samples: unknown[] = [], failures: string[] = [];
  try {
    await (await navigationAction(f.page, "Component bank")).click();
    for (const label of ["A long field label that must remain legible without colliding with what the person is writing",
      "AnUnbrokenFieldLabelThatMustStillFitInsideTheSharedFieldWellWithoutOverlappingTheEnteredValue"]) {
      for (const width of [390, 320]) for (const scale of [1, 1.3, 2]) {
        await f.page.setViewportSize({ width, height: 1000 });
        await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
        for (const kind of ["input.text", "input.multiline"]) {
          const field = f.page.locator(`[data-view-item="specimen:${kind}:value"]`);
          const control = field.locator("input,textarea");
          await stressLabel(field, label);
          for (const focused of [false, true]) {
            if (focused) await control.focus(); else await control.evaluate(element => (element as HTMLElement).blur());
            await settle(f.page);
            await field.scrollIntoViewIfNeeded();
            const geometry = await fieldGeometry(field), key = `${kind}/${width}/${scale}/${focused}/${label.includes(" ") ? "wrapped" : "unbroken"}`;
            samples.push({ key, geometry });
            failures.push(...geometryProblems(geometry, true).map(problem => `${key}: ${problem}`));
          }
          await control.fill(""); await control.focus(); await settle(f.page);
          const empty = await fieldGeometry(field);
          failures.push(...geometryProblems(empty, true).map(problem => `${kind}/${width}/${scale}/focused-empty: ${problem}`));
          await control.fill("A thought worth keeping");
        }
      }
    }
    await saveFieldEvidence(f.page, "long-labels", samples, failures);
  } finally { await f.close(); }
});

test("a scrolling multiline viewport cannot paint beneath its persistent label", { timeout: 30000 }, async () => {
  const f = await publicCatalogFixture();
  const samples: unknown[] = [], failures: string[] = [];
  try {
    await (await navigationAction(f.page, "Component bank")).click();
    const field = f.page.locator('[data-view-item="specimen:input.multiline:value"]'), control = field.locator("textarea");
    await control.fill(Array.from({ length: 40 }, (_, index) => `Line ${index + 1}: writing remains readable while scrolling`).join("\n"));
    // A host-constrained editing viewport is a layout stress, not production CSS.
    await control.evaluate(element => { element.style.maxHeight = "12rem"; element.style.setProperty("field-sizing", "fixed"); });
    for (const width of [1280, 320]) for (const scale of [1, 2]) {
      await f.page.setViewportSize({ width, height: 900 });
      await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      await control.focus(); await settle(f.page); await field.scrollIntoViewIfNeeded();
      await control.evaluate(element => { element.scrollTop = element.scrollHeight; });
      const geometry = await fieldGeometry(field), key = `${width}/${scale}`;
      samples.push({ key, geometry });
      assert.ok(geometry.scrollTop > 0, "The test must exercise a real scrolled textarea");
      if (geometry.control.top < geometry.label.bottom) failures.push(`${key}: Scroll viewport overlaps the persistent label`);
      failures.push(...geometryProblems(geometry, true).map(problem => `${key}: ${problem}`));
    }
    await saveFieldEvidence(f.page, "textarea-scroll", samples, failures);
  } finally { await f.close(); }
});
