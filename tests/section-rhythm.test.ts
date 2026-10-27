// One gap between sections, measured on what a person sees (second review of the slice 3 package): Appearance
// preferences read 32/35/45px between its sections (the tint rail's 44px targets and padding added air around its 32px
// swatches), and a surface's stacks («Anatomy» then «Actions» on the Place page) stood 5px apart where every other pair
// of stacks stands ~25px apart.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

/** The painted extent of each element: its descendants that draw text, a border, a fill or media; a swatch's colour sits
 * 6px inside its target. */
function inks(selectors: readonly string[]) {
  return selectors.map(selector => [...document.querySelectorAll(selector)].map(root => {
    const boxes: DOMRect[] = [];
    for (const element of [root, ...root.querySelectorAll("*")]) {
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      if (box.width < 1 || box.height < 1 || element.closest(".sr-only") || style.visibility === "hidden") continue;
      const text = [...element.childNodes].some(node => node.nodeType === 3 && node.textContent?.trim());
      const fill = style.backgroundColor !== "rgba(0, 0, 0, 0)";
      if (element.classList.contains("swatch")) { boxes.push(new DOMRect(box.x + 6, box.y + 6, box.width - 12, box.height - 12)); continue; }
      if (text && !fill) { const range = document.createRange(); range.selectNodeContents(element); boxes.push(range.getBoundingClientRect()); continue; }
      if (parseFloat(style.borderTopWidth) > 0 || fill || ["IMG", "svg"].includes(element.tagName)) boxes.push(box);
    }
    return { top: Math.min(...boxes.map(box => box.top)), bottom: Math.max(...boxes.map(box => box.bottom)) };
  }));
}

test("appearance preferences: one gap between its sections, whatever each holds", async () => {
  const f = await mounted(`<div style="width:354px"><Catalog.AppearancePreferences value={{ theme: "dark", textSize: "standard", tint: "blue", wallpaper: "silk" }} onchange={() => {}} /></div>`);
  try {
    for (const width of [390, 1280]) {
      await f.page.setViewportSize({ width, height: 1200 });
      const [sections] = await f.page.evaluate(inks, ["[data-scene] fieldset, body > * fieldset"]);
      const outer = sections!.filter((section, index) => !sections!.some((other, at) => at !== index && other.top <= section.top && other.bottom >= section.bottom && (other.top < section.top || other.bottom > section.bottom)));
      const gaps = outer.slice(1).map((section, index) => Math.round(section.top - outer[index]!.bottom));
      assert.equal(gaps.length, 3, `four sections: ${JSON.stringify(outer)}`);
      assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 2, `${width}: the gaps between sections are ${gaps.join("/")}px`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a surface's stacks stand the same gap apart as any two stacks of a page", async () => {
  const f = await mounted(`<div style="width:354px" data-panel><ContentFlow host="panel" onevent={() => {}} resolved={{ view: { version: "desert.view/1",
    id: "probe", outputs: [], content: [
      { kind: "stack", id: "anatomy", title: "Anatomy", items: [{ kind: "fact", label: "Content", value: "Header" }] },
      { kind: "stack", id: "actions", title: "Actions", items: [{ kind: "fact", label: "Open", value: "Transient" }] },
    ] }, bindings: {}, disabledOutputs: [] }} /></div>
  <div style="width:354px" data-page><Catalog.Column gap="regular">
    <Catalog.StackLayout title="Anatomy"><Catalog.Information items={[{ kind: "fact", label: "Content", value: "Header" }]} /></Catalog.StackLayout>
    <Catalog.StackLayout title="Actions"><Catalog.Information items={[{ kind: "fact", label: "Open", value: "Transient" }]} /></Catalog.StackLayout>
  </Catalog.Column></div>`, `  import ContentFlow from "@desert/svelte/catalog/compositions/content-flow/ContentFlow.svelte";`);
  try {
    const [panel, page] = await f.page.evaluate(inks, ["[data-panel] fieldset", "[data-page] fieldset"]);
    const gap = (sections: readonly { top: number; bottom: number }[]) => Math.round(sections[1]!.top - sections[0]!.bottom);
    assert.equal(panel!.length, 2);
    assert.ok(gap(panel!) >= 16, `the surface's stacks are ${gap(panel!)}px apart`);
    assert.equal(gap(panel!), gap(page!), "the same gap as two stacks of a page");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
