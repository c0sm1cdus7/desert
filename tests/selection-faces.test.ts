import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { Check } from "@sinclair/typebox/value";
import { FaceSchema } from "../src/interaction/face.ts";
import { applyControlEvent, controlNode } from "../src/interaction/control-nodes.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

// Faces supplement the label; they never identify currencies implicitly or own interaction.
const faces = [{ kind: "flag", region: "AR" }, { kind: "flag", region: "EU" },
  { kind: "symbol", text: "€" }, { kind: "document" }, { kind: "status", severity: "warning" }];
test("select options accept explicit typed faces without changing selection values", () => {
  for (const face of faces) {
    assert.equal(Check(FaceSchema, face), true, JSON.stringify(face));
    const node = controlNode({ version: "desert.control/1", kind: "select", id: "country", label: "Country",
      disabled: false, required: false, value: "argentina", options: [
        { value: "argentina", label: "Argentina", disabled: false, face },
        { value: "other", label: "Other", disabled: false },
      ] });
    assert.equal(node.kind, "select");
    assert.equal(Object.isFrozen(node), true);
    const changed = applyControlEvent(node, { kind: "select.change", control: "country", value: "other" }).node;
    assert.equal(changed.kind === "select" && changed.value, "other");
  }
});

test("face descriptors reject unknown kinds, missing regions and empty or oversized symbols", () => {
  for (const face of [{ kind: "flag" }, { kind: "flag", region: "ARS" }, { kind: "flag", region: "ar" },
    { kind: "flag", region: "AR\n" }, { kind: "flag", currency: "ARS" }, { kind: "symbol", text: "" },
    { kind: "symbol", text: "   " }, { kind: "symbol", text: "123456789" },
    { kind: "image", src: "javascript:alert(1)" }, { kind: "document", onclick: "bad" }]) {
    assert.equal(Check(FaceSchema, face), false, JSON.stringify(face));
  }
});

const source = `<script lang="ts">
  import SelectionField from "@desert/svelte/pieces/SelectionField.svelte";
  let value = $state('ar'), edits = $state(0);
  const options = [
    {value:'ar',label:'Argentina',disabled:false,face:{kind:'flag',region:'AR'}},
    {value:'gold',label:'Gold',disabled:false,face:{kind:'symbol',text:'✦'}},
    {value:'doc',label:'Document',disabled:false,face:{kind:'document'}},
    {value:'locked',label:'Locked',disabled:true,face:{kind:'status',severity:'warning'}},
    {value:'plain',label:'Plain',disabled:false},
  ];
</script>
<main style="padding:24px;max-width:360px">
  <SelectionField selection="identity" label="Representation" {value} {options}
    onchange={next => { value = next; edits += 1; }} />
  <SelectionField selection="field-identity" label="Field representation" {value} {options} fieldControl
    onchange={next => { value = next; edits += 1; }} />
  <output data-value>{value}</output><output data-edits>{edits}</output>
</main>`;

test("faces appear in triggers and options while labels own typeahead, activation and accessibility", async () => {
  const f = await svelteBrowser(source);
  try {
    const trigger = f.page.getByRole("button", { name: "Representation", exact: true });
    await trigger.waitFor();
    assert.equal(await trigger.locator('[data-piece="face"]').count(), 1);
    assert.match(await trigger.innerText(), /Argentina/);
    assert.match(await trigger.innerText(), /🇦🇷/);
    assert.equal(await f.page.getByRole("button", { name: "Field representation · Argentina", exact: true })
      .locator('[data-piece="face"]').count(), 1);
    await trigger.click();
    const panel = f.page.getByRole("listbox");
    assert.equal(await panel.getByRole("option", { name: "Argentina", exact: true }).count(), 1);
    assert.equal(await panel.getByRole("option", { name: "Gold", exact: true }).count(), 1);
    assert.equal(await panel.locator('[data-piece="face"]').count(), 4);
    assert.equal(await panel.getByRole('button').count(), 0, 'Options do not expose action semantics');
    assert.equal(await panel.locator('[data-piece="face"] [tabindex], [data-piece="face"] button').count(), 0,
      'Decorative faces never add focus stops');
    assert.deepEqual(await panel.locator('[data-piece="face"]').evaluateAll(elements =>
      elements.map(element => element.getAttribute("aria-hidden"))), ["true", "true", "true", "true"]);
    await f.page.keyboard.press("g");
    assert.equal(await panel.getByRole("option", { name: "Gold", exact: true }).getAttribute("data-highlighted"), "");
    assert.equal(await f.page.locator("[data-edits]").innerText(), "0");
    await f.page.keyboard.press("Enter");
    await panel.waitFor({ state: "hidden" });
    assert.equal(await f.page.locator("[data-value]").innerText(), "gold");
    assert.equal(await f.page.locator("[data-edits]").innerText(), "1");
    assert.match(await trigger.innerText(), /✦.*Gold/s);
    await trigger.click();
    await f.page.keyboard.press("End");
    await f.page.keyboard.press("Enter");
    await panel.waitFor({ state: "hidden" });
    assert.equal(await trigger.locator('[data-piece="face"]').count(), 0);
    assert.match(await trigger.innerText(), /Plain/);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("dropdown faces preserve shared Avatar fill and border in every appearance", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(source);
  const directory = new URL(`../artifacts/selection-faces/${process.env.FACE_EVIDENCE ?? "current"}/`, import.meta.url);
  try {
    await mkdir(directory, { recursive: true });
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 390, height: 620 });
    await f.page.getByRole("button", { name: "Representation", exact: true }).click();
    for (const colorScheme of ["light", "dark"] as const) for (const contrast of ["no-preference", "more"] as const) {
      await f.page.emulateMedia({ colorScheme, contrast, reducedMotion: "reduce" });
      const material = await f.page.locator('[role="listbox"] [data-piece="face"]').evaluateAll(elements =>
        elements.map(element => {
          const style = getComputedStyle(element), border = getComputedStyle(element, "::after");
          return { slot: element.getAttribute("data-slot"), fill: style.backgroundColor, border: border.borderTopColor,
            width: border.borderTopWidth, kind: border.borderTopStyle, blend: border.mixBlendMode,
            pointer: border.pointerEvents, filter: style.filter, box: element.getBoundingClientRect().toJSON() };
        }));
      await writeFile(new URL(`${colorScheme}-${contrast}.json`, directory), JSON.stringify(material, null, 2));
      await f.page.screenshot({ path: new URL(`${colorScheme}-${contrast}.png`, directory).pathname });
      assert.equal(material.length, 4);
      for (const face of material) {
        assert.equal(face.slot, "avatar");
        assert.notEqual(face.fill, "rgba(0, 0, 0, 0)");
        assert.notEqual(face.border, "rgba(0, 0, 0, 0)");
        assert.equal(face.kind, "solid"); assert.ok(parseFloat(face.width) >= 1);
        assert.equal(face.blend, "normal"); assert.equal(face.pointer, "none");
        assert.equal(face.filter, "none");
        assert.ok(face.box.width >= 20 && face.box.width <= 32);
        assert.equal(face.box.width, face.box.height);
      }
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
