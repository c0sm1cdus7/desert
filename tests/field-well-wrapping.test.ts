import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { fieldGeometry, geometryProblems } from "./web/field-geometry.ts";

const source = `<script lang="ts">
  import TextInput from "@desert/svelte/pieces/TextInput.svelte";
  import * as Field from "@desert/svelte/vendor/components/ui/field/index.js";
  let values = $state({ text: '', multiline: '' });
  const label = 'A long label with enough detail to wrap safely in a compact shared form';
</script>
<main style="max-width:600px;padding:16px">
  <Field.FieldGroup>
    <div data-case="text"><TextInput primitive="input.text" {label} value={values.text}
      required onchange={value => values.text = value} /></div>
    <div data-case="multiline"><TextInput primitive="input.multiline" {label} value={values.multiline}
      required onchange={value => values.multiline = value} /></div>
    <div data-case="invalid"><TextInput primitive="input.text" {label} value="Retained invalid writing"
      required error="Check this value." onchange={() => {}} /></div>
    <div data-case="disabled"><TextInput primitive="input.multiline" {label} value="Retained disabled writing"
      disabled onchange={() => {}} /></div>
  </Field.FieldGroup>
</main>`;

test("real shared labels wrap, focus their editors, and preserve state in default and reference profiles", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    for (const profile of ["default", "apple-reference"]) for (const width of [900, 320]) for (const scale of [1, 2]) {
      await f.page.setViewportSize({ width, height: 1000 });
      await f.page.evaluate(({ profile, scale }) => {
        if (profile === "default") delete document.documentElement.dataset.rendererProfile;
        else document.documentElement.dataset.rendererProfile = profile;
        document.documentElement.style.setProperty("--text-scale", String(scale));
      }, { profile, scale });
      for (const kind of ["text", "multiline"]) {
        const field = f.page.locator(`[data-case="${kind}"]`), control = field.getByRole("textbox");
        await control.fill(""); await control.blur();
        assert.deepEqual(geometryProblems(await fieldGeometry(field), false), []);
        await field.locator("label").click();
        assert.equal(await control.evaluate(node => node === document.activeElement), true, "Visible label focuses its editor");
        assert.deepEqual(geometryProblems(await fieldGeometry(field), true), [], `${profile}/${width}/${scale}/${kind}/focused-empty`);
        await control.fill("Writing remains separate from the full label"); await control.blur();
        assert.equal(await control.inputValue(), "Writing remains separate from the full label");
        assert.deepEqual(geometryProblems(await fieldGeometry(field), true), [], `${profile}/${width}/${scale}/${kind}/value`);
      }
      for (const state of ["invalid", "disabled"]) {
        const field = f.page.locator(`[data-case="${state}"]`), geometry = await fieldGeometry(field);
        assert.deepEqual(geometryProblems(geometry, true), [], `${profile}/${width}/${scale}/${state}`);
        assert.equal(geometry.disabled, state === "disabled");
        assert.equal(geometry.invalid, String(state === "invalid"));
      }
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
