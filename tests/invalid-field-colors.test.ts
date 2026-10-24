import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import WritingField from "@desert/svelte/catalog/foundations/field/Field.svelte";
  import MoneyControl from "@desert/svelte/catalog/compositions/money-control/MoneyControl.svelte";
  import * as Field from "@desert/svelte/vendor/components/ui/field/index.js";
  import { Input } from "@desert/svelte/vendor/components/ui/input/index.js";
  let invalid = $state(false), single = $state('A clear value'), multiline = $state('More than one line');
</script>
<main style="max-width:640px;padding:24px;display:grid;gap:24px">
  <WritingField primitive="input.text" labelVisibility="visible" measure="writing" invalid={false} disabled={false} purpose="text" clear label="Title" value={single} required
    error={invalid ? 'Enter a valid title.' : undefined} onchange={value => single = value} />
  <WritingField primitive="input.multiline" labelVisibility="visible" measure="writing" required={false} disabled={false} label="Content" value={multiline} {invalid}
    onchange={value => multiline = value} />
  <Field.Field data-invalid={invalid}>
    <Field.FieldLabel for="plain">Plain field</Field.FieldLabel>
    <Input id="plain" value="Unchanged content" aria-invalid={invalid} />
  </Field.Field>
  <MoneyControl node={{version:'desert.control/1',kind:'money',id:'budget',label:'Budget',
    disabled:false,required:false,currencies:[{code:'USD',scale:2},{code:'ARS',scale:2}],currency:'USD',minorUnits:'100'}}
    onevent={() => {}} />
  <button onclick={() => invalid = !invalid}>Toggle validation</button>
</main>`;

for (const colorScheme of ["light", "dark"] as const) {
  test(`invalid fields color labels, not entered values (${colorScheme})`, { timeout: 30000 }, async () => {
    const f = await svelteBrowser(source);
    try {
      await f.page.addStyleTag({ content: await rendererCss() });
      await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      const fields = f.page.locator('[data-slot="field"]');
      const colors = () => fields.evaluateAll(elements => elements.map(element => {
        const label = element.querySelector('[data-slot="field-label"]')!;
        const input = element.querySelector('input,textarea')!;
        const well = element.querySelector('[data-floating-field]');
        return { label: getComputedStyle(label).color, value: getComputedStyle(input).color,
          border: well ? getComputedStyle(well).borderColor : null };
      }));
      const normal = await colors();
      await f.page.getByRole('button', { name: 'Toggle validation' }).click();
      const budget = f.page.getByRole('textbox', { name: 'Budget', exact: true });
      const previousAmount = await budget.inputValue();
      await budget.fill('not an amount');
      assert.equal(await budget.inputValue(), previousAmount, 'impossible characters are rejected before validation');
      await budget.fill('-'); // A permitted but incomplete numeric draft needs an error label.
      await f.page.getByRole('textbox', { name: 'Title', exact: true }).fill('Still readable');
      const directory = `artifacts/invalid-field-label/${process.env.DESERT_EVIDENCE_PHASE ?? 'final'}`;
      await mkdir(directory, { recursive: true });
      await f.page.locator('main').screenshot({ path: `${directory}/${colorScheme}.png` });
      const invalid = await colors();
      const errorColor = await f.page.locator('[data-slot="field-error"]').evaluate(el => getComputedStyle(el).color);
      for (let index = 0; index < normal.length; index++) {
        assert.equal(invalid[index]!.value, normal[index]!.value, `field ${index}: content keeps its normal color`);
        assert.equal(invalid[index]!.label, errorColor, `field ${index}: label uses the accessible error-text color`);
        if (normal[index]!.border) assert.equal(invalid[index]!.border, normal[index]!.border, 'invalidity adds ink, not a different material perimeter');
      }
      const title = f.page.getByRole('textbox', { name: 'Title', exact: true });
      assert.equal(await title.getAttribute('aria-invalid'), 'true');
      assert.equal(await title.getAttribute('aria-describedby'), await f.page.locator('[data-slot="field-error"]').getAttribute('id'));
      assert.equal(await fields.first().locator('[data-floating-field]').evaluate(el => getComputedStyle(el).outlineWidth), '2px');
      assert.equal(await title.inputValue(), 'Still readable');
      await f.page.getByRole('button', { name: 'Toggle validation' }).click();
      await f.page.getByRole('textbox', { name: 'Budget', exact: true }).fill('1.00');
      assert.deepEqual(await colors(), normal, 'correction restores the original label and border colors');
      assert.equal(await title.getAttribute('aria-invalid'), 'false');
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}
