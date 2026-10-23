import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import BankRenderer from "@desert/svelte/catalog/renderer/bank-renderer/BankRenderer.svelte";
  import * as Field from "@desert/svelte/vendor/components/ui/field/index.js";
  const version = 'desert.bank-node/1', controlVersion = 'desert.control/1';
  const nodes = [
    { version, kind:'input.text',name:'name',label:'Name',value:'A clear value',required:true,disabled:false },
    { version, kind:'control.select',control:{version:controlVersion,kind:'select',id:'destination',label:'Destination',
      disabled:false,required:true,value:'mountain',options:[{value:'mountain',label:'A clear value',disabled:false}]} },
    { version, kind:'control.money',control:{version:controlVersion,kind:'money',id:'budget',label:'Budget',
      disabled:false,required:false,currencies:[{code:'USD',scale:2},{code:'ARS',scale:2}],currency:'USD',minorUnits:'100'} },
  ];
</script>
<div data-geometry-host style="max-width:600px;padding:16px">
  <Field.FieldGroup>{#each nodes as node}<BankRenderer {node} />{/each}</Field.FieldGroup>
</div>`;

test("the shared field well keeps text, selection and money labels separate on one baseline in both profiles", { timeout: 30000 }, async t => {
  const fixture = await svelteBrowser(source);
  try {
    await fixture.page.addStyleTag({ content: await rendererCss() });
    await fixture.page.emulateMedia({ reducedMotion: "reduce" });
    for (const profile of ["default", "apple-reference"]) for (const width of [900, 390]) {
      await fixture.page.setViewportSize({ width, height: 900 });
      await fixture.page.evaluate(profile => {
        if (profile === "default") delete document.documentElement.dataset.rendererProfile;
        else document.documentElement.dataset.rendererProfile = profile;
      }, profile);
      const values = await fixture.page.locator("[data-floating-field]").evaluateAll(wells => wells.map(well => {
        const field = well.querySelector<HTMLElement>('[data-field-well] :is([data-slot="input-group-control"], [data-field-value])')!;
        const label = well.querySelector<HTMLElement>('[data-slot="field-label"]')!;
        const rect = field.getBoundingClientRect(), labelRect = label.getBoundingClientRect(), wellRect = well.getBoundingClientRect();
        const style = getComputedStyle(field), labelStyle = getComputedStyle(label);
        const paddingTop = parseFloat(style.paddingTop), paddingBottom = parseFloat(style.paddingBottom);
        const borderTop = parseFloat(style.borderTopWidth), borderBottom = parseFloat(style.borderBottomWidth);
        const lineHeight = parseFloat(style.lineHeight);
        // Inputs expose no text Range. Their native single-line editor centers its
        // line box in the content box; the selection's value row exposes its
        // own text span inside the whole-well native trigger.
        const valueTop = field instanceof HTMLInputElement
          ? rect.top + borderTop + paddingTop + (rect.height - borderTop - borderBottom - paddingTop - paddingBottom - lineHeight) / 2
          : field.querySelector<HTMLElement>(":scope > span")!.getBoundingClientRect().top;
        return { name: label.textContent, height: wellRect.height, font: parseFloat(style.fontSize), lineHeight,
          labelFont: parseFloat(labelStyle.fontSize), labelLineHeight: parseFloat(labelStyle.lineHeight),
          separation: valueTop - labelRect.bottom, valueOffset: valueTop - wellRect.top,
          labelOffset: labelRect.top - wellRect.top, labelBottom: labelRect.bottom - wellRect.top };
      }));
      t.diagnostic(JSON.stringify({ profile, width, values }));
      assert.equal(values.length, 3);
      for (const value of values) {
        assert.ok(value.separation >= 4, `${profile}/${width}/${value.name}: label and value must have a visible gap`);
        // The label now owns real flow space outside the scrolling/editor box.
        // The complete well retains its 60px content height plus its one border.
        assert.equal(value.height, 62, "the shared field boundary retains its height");
        assert.equal(value.font, 16); assert.equal(value.lineHeight, 24);
        assert.equal(value.labelFont, 12); assert.equal(value.labelLineHeight, 16);
        assert.ok(Math.abs(value.valueOffset - values[0]!.valueOffset) < .5, "all value line boxes share a baseline");
        assert.ok(Math.abs(value.labelOffset - values[0]!.labelOffset) < .5, "all labels share a baseline");
      }
      const money = fixture.page.locator('[data-control="money"] [data-floating-field]');
      for (const part of [money.getByRole("textbox"), money.getByRole("button", { name: "USD · Budget currency", exact: true })]) {
        await part.focus();
        assert.equal(await money.evaluate(node => getComputedStyle(node).outlineWidth), "2px", "compound root owns keyboard focus");
        assert.equal(await part.evaluate(node => getComputedStyle(node).outlineStyle), "none", "no inner square focus ring");
      }
    }
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});
