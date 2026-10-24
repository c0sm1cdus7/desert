// Tag: a toned chip (removable when its owner allows) or a reference read as text beside its color. It absorbs LabelRail's
// badges, ReferenceValues' references and MediaControl's tag, at their pixels.
import assert from "node:assert/strict";
import test from "node:test";
import { TagToneSchema } from "../src/interaction/extended-nodes.ts";
import { absorbedPiecesBefore } from "./fixtures/absorbed-pieces-before.ts";
import { mountedBefore } from "./support/before.ts";
import { contractShape, specimenFindings } from "./support/foundation.ts";

const tones = TagToneSchema.anyOf.map(member => member.const);

test("tag: the contract offers a label, a presentation, the tag tones, a reference color and state, removal, nothing else", async () => {
  assert.deepEqual(await contractShape("tag"), {
    label: "text", disabled: "boolean", state: ["known", "unavailable"], "color?": ["ReferenceColorSchema", "undefined"],
    presentation: ["chip", "text"], "tone?": [...tones, "undefined"], removable: ["boolean", false], "removeLabel?": ["text", "undefined"],
  });
});

test("tag: every state × presentation × tone a tag can have has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("tag"), []);
});

const page = `<div data-probe-host style="width:480px">
  <div data-before-rail><Catalog.LabelRail values={["Design"]} onremove={() => {}} /></div>
  <div data-after-rail><Catalog.Tag presentation="chip" tone="neutral" label="Design" state="known" removable removeLabel="Remove Design"
    disabled={false} onremove={() => removed += 1} /></div>
  <div data-locked><Catalog.Tag presentation="chip" tone="neutral" label="Locked" state="known" removable removeLabel="Remove Locked"
    disabled onremove={() => removed += 100} /></div>
  {#each tones as tone}
    <div data-before-tone={tone}><Catalog.MediaControl node={{ version: "desert.control/1", kind: "tag", id: tone, label: tone, disabled: false, tone }} /></div>
    <div data-after-tone={tone}><Catalog.Tag presentation="chip" {tone} label={tone} state="known" removable={false} disabled={false} /></div>
  {/each}
  <div data-before-reference><Catalog.ReferenceValues values={["work", "gone"]} options={[{ value: "work", label: "Work", color: "rose" }]} /></div>
  <div data-after-reference style="display:flex;flex-wrap:wrap;gap:.35em .8em"><Catalog.Tag presentation="text" label="Work" color="rose" state="known" removable={false} disabled={false} />
    <Catalog.Tag presentation="text" label="Unavailable" state="unavailable" removable={false} disabled={false} /></div>
</div><output data-removed>{removed}</output>`;
const script = `  const tones = ${JSON.stringify(tones)};\n  let removed = $state(0);`;
const look = (selector: string) => `[...document.querySelectorAll(${JSON.stringify(selector)})].map(node => {
  const style = getComputedStyle(node), box = node.getBoundingClientRect();
  return { tag: node.tagName, text: node.textContent.trim(), width: Math.round(box.width), height: Math.round(box.height), display: style.display,
    gap: style.columnGap, padding: style.padding, radius: style.borderRadius, font: style.font, color: style.color, background: style.backgroundColor,
    border: style.borderTopWidth + " " + style.borderTopColor };
})`;

test("tag: chips keep LabelRail's and MediaControl's pixels; text keeps ReferenceValues'; remove fires unless disabled", async () => {
  const f = await mountedBefore(absorbedPiecesBefore, page, script);
  try {
    const measure = (selector: string) => f.page.evaluate(look(selector));
    assert.deepEqual(await measure("[data-after-rail] [data-slot=badge], [data-after-rail] button"),
      await measure("[data-before-rail] [data-slot=badge], [data-before-rail] button"));
    for (const tone of tones) assert.deepEqual(await measure(`[data-after-tone="${tone}"] [data-slot=badge]`),
      await measure(`[data-before-tone="${tone}"] [data-slot=badge]`), tone);
    assert.deepEqual(await measure("[data-after-reference] > *, [data-after-reference] .color-bullet"),
      await measure("[data-before-reference] .reference-value, [data-before-reference] .color-bullet"));
    await f.page.locator("[data-after-rail]").getByRole("button", { name: "Remove Design", exact: true }).click();
    assert.equal(await f.page.locator("[data-removed]").innerText(), "1");
    const locked = f.page.getByRole("button", { name: "Remove Locked", exact: true });
    assert.equal(await locked.isDisabled(), true);
    await locked.click({ force: true });
    assert.equal(await f.page.locator("[data-removed]").innerText(), "1");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
