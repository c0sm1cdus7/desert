import assert from "node:assert/strict";
import test from "node:test";
import { captureMaterialProbe } from "./scroll-material-probe.ts";

// Latest direction: a shallow feathered top layer protects the handing-off title;
// the approved bottom shading stays unchanged. Numeric tolerances are diagnostics,
// not Apple/HIG thresholds. Earlier glass-only results remain in artifacts.
test("top edge separates its title progressively and honors accessibility", { timeout: 30000 }, async t => {
  const { report, states, directory } = await captureMaterialProbe();
  t.diagnostic(directory);
  const normal = report.find(value => value.name === "normal")!;
  await t.test("top decoration uses a masked shallow blur and retains recognizable colors", () => {
    const state = states.find(value => value.name === "probe-normal")!;
    assert.ok(state.layers.every(layer => layer.filter === "none"));
    assert.ok(state.layers.some(layer => layer.blur === 'blur(8px)' && /linear-gradient/.test(layer.mask)),
      'the optical layer feathers rather than ending with a hard blur boundary');
    for (const row of normal.rows.filter(row => row.y <= 28)) {
      assert.ok(row.transmittedColor > 0.1 && row.red[0]! > row.red[1]! + 8 && row.cyan[2]! > row.cyan[0]! + 8,
        "shading retains distinct source hues rather than replacing them with a flat strip");
    }
  });
  await t.test("fine detail returns progressively outside the title protection", () => {
    const core = normal.rows.find(row => row.y === 28)!;
    const near = normal.rows.find(row => row.y === 48)!;
    const far = normal.rows.find(row => row.y === 64)!;
    const clear = normal.rows.find(row => row.y === 110)!;
    assert.ok(core.retainedFineVariation < near.retainedFineVariation && near.retainedFineVariation < far.retainedFineVariation,
      'detail becomes progressively clearer away from the title');
    assert.ok(core.transmittedColor < near.transmittedColor && near.transmittedColor < far.transmittedColor
      && far.transmittedColor < clear.transmittedColor, "shading fades gradually away from the toolbar");
    assert.ok(clear.transmittedColor >= 0.95 && clear.retainedFineVariation >= 0.95);
  });
  await t.test("reduced transparency and increased contrast independently remove blur", () => {
    for (const mode of ["reduced", "contrast"]) {
      const state = states.find(value => value.name === `probe-${mode}`)!;
      assert.equal(state.reducedTransparency, mode === "reduced");
      assert.equal(state.increasedContrast, mode === "contrast");
      assert.ok(state.layers.every(layer => layer.blur === "none"), "system preference disables blur");
      assert.ok(report.find(value => value.name === mode)!.rows[0]!.transmittedColor < 0.1,
        "the fallback provides a genuinely stronger separator instead of overriding the preference");
    }
  });
});
