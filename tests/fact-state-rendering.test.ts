import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { factCases, factStateSource, factVisual, storedSnapshot } from "./fixtures/fact-state-presentation.ts";

const consumers = ["facts", "information"] as const;
const css = rendererCss();
const evidence = process.env.DESERT_FACT_EVIDENCE;
const evidenceDirectory = resolve(import.meta.dirname, "../artifacts/fact-state-presentation");

test("both Fact consumers distinguish passive value states, without changing stored values", async () => {
  const f = await svelteBrowser(factStateSource), failures: string[] = [];
  try {
    await f.page.addStyleTag({ content: await css });
    for (const consumer of consumers) {
      const section = f.page.locator(`[data-consumer="${consumer}"]`);
      assert.deepEqual(await section.locator("dt").allTextContents(), factCases.map(item => item.label));
      for (const [index, item] of factCases.entries()) {
        const value = section.locator("dd").nth(index), visual = await factVisual(value, item.visible);
        const accessible = await value.ariaSnapshot();
        const prefix = `${consumer}/${item.field}`;
        if (!accessible.includes(item.visible.trim().replace(/\s+/g, " "))) failures.push(`${prefix}: accessible value is missing`);
        if (item.state === "known") {
          if (visual.text !== item.visible) failures.push(`${prefix}: stored text was changed`);
          if (visual.glyphs.length !== 0) failures.push(`${prefix}: known values have a state glyph`);
          if (accessible.includes("Value state:")) failures.push(`${prefix}: literal value is announced as a placeholder`);
        } else {
          if (!accessible.includes(`Value state: ${item.visible}`)) failures.push(`${prefix}: placeholder is not distinguished in accessible reading`);
          if (visual.glyphs.length !== 1) failures.push(`${prefix}: requires one state glyph`);
          for (const glyph of visual.glyphs) {
            if (glyph.hidden !== "true") failures.push(`${prefix}: decorative glyph is exposed`);
            if (glyph.animation !== "none") failures.push(`${prefix}: state is incorrectly animated`);
          }
        }
      }
      assert.equal(await section.locator('button,a[href],input,textarea,select,[tabindex],[role],[aria-live],[aria-busy="true"]').count(), 0,
        `${consumer}: facts remain passive, without live/status/loading semantics`);
    }
    await f.page.locator('[data-boundary="before"]').focus();
    await f.page.keyboard.press("Tab");
    assert.equal(await f.page.locator('[data-boundary="after"]').evaluate(node => node === document.activeElement), true);
    assert.equal(await f.page.locator("[data-stored]").textContent(), storedSnapshot);
    assert.deepEqual(f.errors, []);
    if (evidence) {
      await mkdir(evidenceDirectory, { recursive: true });
      await writeFile(resolve(evidenceDirectory, `${evidence}-semantics.json`), JSON.stringify({ failures, snapshot: await f.page.locator("main").ariaSnapshot() }, null, 2));
    }
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("shared Fact states use distinct glyphs and semantic secondary text in both themes and at 200 percent", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(factStateSource), failures: string[] = [], palettes: string[] = [];
  try {
    await f.page.addStyleTag({ content: await css });
    for (const theme of ["light", "dark"] as const) for (const width of [900, 320]) for (const scale of [1, 2]) {
      await f.page.setViewportSize({ width, height: 1000 });
      await f.page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await f.page.evaluate(({ theme, scale }) => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.setProperty("--text-scale", String(scale));
      }, { theme, scale });
      const observations = [];
      for (const consumer of consumers) {
        const section = f.page.locator(`[data-consumer="${consumer}"]`), values = section.locator("dd");
        const known = await factVisual(values.nth(0), "Lisbon");
        const empty = await factVisual(values.nth(1), "Empty"), unknown = await factVisual(values.nth(3), "Unknown");
        const secondary = await section.locator("dt").first().evaluate(node => getComputedStyle(node).color);
        const prefix = `${theme}/${width}/${scale}/${consumer}`;
        if (known.color === empty.color || known.color === unknown.color) failures.push(`${prefix}: placeholders look like known values`);
        if (empty.color !== secondary || unknown.color !== secondary) failures.push(`${prefix}: placeholders do not use secondary text`);
        if (!empty.glyphs[0] || !unknown.glyphs[0] || empty.glyphs[0].shape === unknown.glyphs[0].shape) failures.push(`${prefix}: empty and unknown glyphs must differ`);
        for (const [index, item] of factCases.entries()) {
          const visual = await factVisual(values.nth(index), item.visible);
          if (visual.overflow || !visual.inRow) failures.push(`${prefix}/${item.field}: value overflows`);
          if (visual.glyphs.some(glyph => glyph.width <= 0 || glyph.height <= 0)) failures.push(`${prefix}/${item.field}: state glyph is not visible`);
          if (item.field !== "multiline" && JSON.stringify(visual.chrome) !== JSON.stringify(known.chrome)) failures.push(`${prefix}/${item.field}: state changed row chrome`);
          if (item.state === "known" && visual.color !== known.color) failures.push(`${prefix}/${item.field}: known value lost primary treatment`);
          if (item.state !== "known" && visual.color !== secondary) failures.push(`${prefix}/${item.field}: placeholder lost secondary treatment`);
          if (item.state !== "known" && visual.contrast < 4.5) failures.push(`${prefix}/${item.field}: placeholder contrast ${visual.contrast.toFixed(2)} is below 4.5:1`);
          if (scale === 2 && visual.fontSize < 26) failures.push(`${prefix}/${item.field}: text did not scale`);
          if (item.field === "multiline" && !["pre-wrap", "break-spaces"].includes(visual.whiteSpace)) failures.push(`${prefix}: multiline whitespace is not preserved`);
          observations.push({ consumer, field: item.field, ...visual });
        }
        if (width === 900 && scale === 1) palettes.push(`${theme}/${consumer}/${known.color}/${empty.color}`);
      }
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${theme}/${width}/${scale}: viewport overflows`);
      if (evidence) {
        await mkdir(evidenceDirectory, { recursive: true });
        const name = `${evidence}-${theme}-${width}-${scale}`;
        await writeFile(resolve(evidenceDirectory, `${name}.json`), JSON.stringify(observations, null, 2));
        await f.page.screenshot({ path: resolve(evidenceDirectory, `${name}.png`), fullPage: true });
      }
    }
    for (const consumer of consumers) {
      const light = palettes.find(value => value.startsWith(`light/${consumer}/`))!.split("/").slice(2);
      const dark = palettes.find(value => value.startsWith(`dark/${consumer}/`))!.split("/").slice(2);
      assert.notDeepEqual(light, dark, `${consumer}: actual palette changes across themes`);
    }
    assert.deepEqual(f.errors, []); assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("Fact states remain readable on card and prose surfaces with increased contrast", async () => {
  const f = await svelteBrowser(factStateSource);
  let equalColorCases = 0;
  try {
    await f.page.addStyleTag({ content: await css });
    await f.page.setViewportSize({ width: 320, height: 1000 });
    for (const theme of ["light", "dark"] as const) for (const contrast of ["no-preference", "more"] as const) {
      await f.page.emulateMedia({ colorScheme: theme, contrast, reducedMotion: "reduce" });
      await f.page.evaluate(theme => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.setProperty("--text-scale", "2");
      }, theme);
      assert.equal(await f.page.evaluate(() => matchMedia("(prefers-contrast: more)").matches), contrast === "more");
      const observations = [];
      for (const consumer of [...consumers, "prose"]) {
        const values = f.page.locator(`[data-consumer="${consumer}"] dd`);
        const known = await factVisual(values.nth(0), "Lisbon"), empty = await factVisual(values.nth(1), "Empty");
        const unknown = await factVisual(values.nth(consumer === "prose" ? 2 : 3), "Unknown");
        const prefix = `${theme}/${contrast}/${consumer}`;
        assert.equal(known.glyphs.length, 0, `${prefix}: known value stays glyph-free`);
        assert.equal(empty.glyphs.length, 1); assert.equal(unknown.glyphs.length, 1);
        assert.notEqual(empty.glyphs[0]!.shape, unknown.glyphs[0]!.shape, `${prefix}: glyphs distinguish states without color`);
        if (contrast === "more" && known.color === empty.color) equalColorCases++;
        for (const [state, visual] of [["empty", empty], ["unknown", unknown]] as const) {
          assert.ok(visual.contrast >= 4.5, `${prefix}/${state}: ${visual.contrast.toFixed(2)}:1 contrast must reach 4.5:1`);
          assert.ok(visual.glyphs[0]!.width > 0 && visual.glyphs[0]!.height > 0, `${prefix}/${state}: glyph remains visible`);
          assert.equal(visual.glyphs[0]!.hidden, "true");
          assert.equal(visual.overflow, false);
        }
        observations.push({ consumer, known, empty, unknown });
      }
      if (evidence) {
        await mkdir(evidenceDirectory, { recursive: true });
        const name = `${evidence}-${theme}-contrast-${contrast}`;
        await writeFile(resolve(evidenceDirectory, `${name}.json`), JSON.stringify(observations, null, 2));
        await f.page.screenshot({ path: resolve(evidenceDirectory, `${name}.png`), fullPage: true });
      }
    }
    assert.ok(equalColorCases > 0, "increased contrast actually exercises states whose color equals the known value");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
