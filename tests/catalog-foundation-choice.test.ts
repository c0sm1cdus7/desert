// Choice: options as data, drawn as rows, cards, swatches or a menu. It absorbs ChoiceItem, ChoiceList, ChoiceRow and
// SelectionField, and AppearancePreferences' cards and swatches, at their pixels; its behaviour is theirs.
import assert from "node:assert/strict";
import test from "node:test";
import { choiceOptions } from "./fixtures/choice-family.ts";
import { appearancePreferencesBefore } from "./fixtures/appearance-before.ts";
import { mountedBefore } from "./support/before.ts";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("choice: the contract offers exactly DESIGN §1.3: label, presentation, cardinality, options, selection, menu trigger", async () => {
  assert.deepEqual(await contractShape("choice"), {
    label: "text", labelVisibility: ["visible", "accessible"], selected: "array", disabled: "boolean", required: "boolean",
    presentation: ["rows", "cards", "swatches", "menu"], cardinality: ["one", "many"], options: ["array", "array"],
    "menuTrigger?": ["undefined", "well", "inline", "contextual"], "placeholder?": ["undefined", "text"],
  });
});

test("choice: every state × the presentations and cardinalities a choice can take has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("choice"), []);
});

const geometry = (selector: string) => `[...document.querySelectorAll(${JSON.stringify(selector)})].map(node => {
  const style = getComputedStyle(node), box = node.getBoundingClientRect(), before = getComputedStyle(node, "::before");
  return { text: node.textContent.replace(/\\s+/g, ""), width: Math.round(box.width), height: Math.round(box.height), display: style.display,
    padding: style.padding, margin: style.margin, gap: style.columnGap, font: style.font, color: style.color, background: style.backgroundColor,
    radius: style.borderRadius, border: style.borderTopWidth + " " + style.borderTopStyle, cursor: style.cursor, opacity: style.opacity,
    outline: style.outlineStyle === "none" ? "none" : style.outlineWidth + " " + style.outlineStyle + " " + style.outlineOffset,
    divider: before.content === "none" ? null : [before.height, before.insetInlineStart, before.insetInlineEnd, before.backgroundColor] };
})`;

const rowsPage = `<main style="width:520px;padding:16px">
  <section data-before-one>{#if single.kind === "options"}<Catalog.OptionsControl node={single} onevent={() => {}} />{/if}</section>
  <section data-after-one><Catalog.Choice presentation="rows" cardinality="one" label="Inline route" labelVisibility="visible" {options}
    selected={one} disabled={false} required onchange={next => one = [...next]} /></section>
  <section data-before-many>{#if multiple.kind === "options"}<Catalog.OptionsControl node={multiple} onevent={() => {}} />{/if}</section>
  <section data-after-many><Catalog.Choice presentation="rows" cardinality="many" label="Interests" labelVisibility="visible" {options}
    selected={many} disabled={false} required={false} onchange={next => many = [...next]} /></section>
</main><output data-one>{one.join(",")}</output><output data-many>{many.join(",")}</output>`;
const rowsScript = `  import { controlNode } from "@desert/interaction/control-nodes.ts";
  const options = ${JSON.stringify(choiceOptions)};
  const descriptor = { version: "desert.control/1", kind: "options", disabled: false, minSelected: 0, options };
  const single = controlNode({ ...descriptor, id: "single", label: "Inline route", inputRequired: true, minSelected: 1, maxSelected: 1, selected: [] });
  const multiple = controlNode({ ...descriptor, id: "multiple", label: "Interests", maxSelected: 4, selected: ["alpine"] });
  let one = $state([]), many = $state(["alpine"]);`;

test("choice rows: OptionsControl's legend, pane and rows, pixel for pixel; a label activates its radio or checkbox", async () => {
  const f = await mounted(rowsPage, rowsScript);
  try {
    const measure = (selector: string) => f.page.evaluate(geometry(selector));
    for (const cardinality of ["one", "many"]) {
      const parts = (side: string) => [`[data-${side}-${cardinality}] legend`, `[data-${side}-${cardinality}] label`,
        `[data-${side}-${cardinality}] label > span`, `[data-${side}-${cardinality}] [role="radio"], [data-${side}-${cardinality}] [role="checkbox"]`];
      const [before, after] = [parts("before"), parts("after")];
      for (const [index, selector] of after.entries()) assert.deepEqual(await measure(selector), await measure(before[index]!), `${cardinality}: ${selector}`);
    }
    const after = f.page.locator("[data-after-one]");
    await after.getByText("Beach walk", { exact: true }).click();
    assert.equal(await f.page.locator("[data-one]").innerText(), "beach");
    await after.getByRole("radio", { name: "Beach walk" }).press("ArrowUp");
    assert.equal(await f.page.locator("[data-one]").innerText(), "alps", "arrows move the one choice, as a radio group does");
    await after.getByText("Closed route", { exact: true }).click({ force: true });
    assert.equal(await f.page.locator("[data-one]").innerText(), "alps", "a disabled option is not chosen");
    const many = f.page.locator("[data-after-many]");
    await many.getByText("Beach walk", { exact: true }).click();
    assert.equal(await f.page.locator("[data-many]").innerText(), "alpine,beach");
    await many.getByText("Alpine trail", { exact: true }).first().click();
    assert.equal(await f.page.locator("[data-many]").innerText(), "beach");
    assert.equal(await many.getByRole("checkbox", { name: "Beach walk" }).getAttribute("aria-describedby") !== null, true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

const appearancePage = `<main style="width:520px;padding:16px">
  <section data-before><Catalog.AppearancePreferences value={{ theme: "dark", textSize: "standard", tint: "rose", wallpaper: "mist" }} onchange={() => {}} /></section>
  <section data-after-theme><Catalog.Choice presentation="cards" cardinality="one" label="Appearance" labelVisibility="accessible"
    options={themes} selected={theme} disabled={false} required={false} onchange={next => { theme = [...next]; changes += 1; }} /></section>
  <section data-after-size style="display:flex;flex-direction:column"><Catalog.Choice presentation="menu" cardinality="one" menuTrigger="well" label="Text size" labelVisibility="accessible"
    options={sizes} selected={["standard"]} disabled={false} required={false} /></section>
  <section data-after-tint><Catalog.Choice presentation="swatches" cardinality="one" label="Tint" labelVisibility="accessible"
    options={tints} selected={["rose"]} disabled={false} required={false} /></section>
  <section data-after-wallpaper><Catalog.Choice presentation="cards" cardinality="one" label="Wallpaper" labelVisibility="accessible"
    options={wallpapers} selected={["mist"]} disabled={false} required={false} /></section>
</main><output data-theme>{theme.join(",")}:{changes}</output>`;
const appearanceScript = `  import { appearanceChoices } from "@desert/svelte/infra/appearance-preferences.ts";
  const themes = appearanceChoices.theme.map(choice => ({ ...choice, disabled: false, leading: { kind: "theme", mode: choice.value, tint: "rose", wallpaper: "mist" } }));
  const sizes = appearanceChoices.textSize.map(choice => ({ ...choice, disabled: false }));
  const tints = appearanceChoices.tint.map(choice => ({ ...choice, disabled: false, leading: { kind: "color", color: choice.value } }));
  const wallpapers = appearanceChoices.wallpaper.map(choice => ({ ...choice, disabled: false, leading: { kind: "wallpaper", wallpaper: choice.value } }));
  let theme = $state(["dark"]), changes = $state(0);`;

test("choice cards, swatches and the well menu: AppearancePreferences' pixels; the chosen card reports itself again", async () => {
  const f = await mountedBefore(appearancePreferencesBefore, appearancePage, appearanceScript);
  try {
    const measure = (selector: string) => f.page.evaluate(geometry(selector));
    const pairs: readonly (readonly [string, string])[] = [
      ["[data-after-theme] label", "[data-before] .appearance-mode-grid > label"],
      ["[data-after-theme] [role=radiogroup] > div", "[data-before] .appearance-mode-grid"],
      ["[data-after-wallpaper] label", "[data-before] .appearance-wallpaper-grid > label"],
      ["[data-after-wallpaper] [role=radiogroup] > div", "[data-before] .appearance-wallpaper-grid"],
      ["[data-after-tint] label", "[data-before] .appearance-tint-rail > label"],
      ["[data-after-tint] [role=radiogroup] > div", "[data-before] .appearance-tint-rail"],
      ["[data-after-size] [data-selection-trigger]", "[data-before] [data-selection-trigger]"],
    ];
    for (const [after, before] of pairs) assert.deepEqual(await measure(after), await measure(before), after);
    const listbox = async (section: string) => {
      await f.page.locator(`${section} [data-selection-trigger]`).click();
      await f.page.getByRole("listbox").waitFor();
      // The entrance may not have started when the listbox appears: wait until the pane is shown, then for its motion.
      await f.page.waitForFunction(() => getComputedStyle(document.querySelector('[data-slot="popover-content"]')!).opacity === "1");
      await f.page.locator('[data-slot="popover-content"]').evaluate(async node => { await Promise.all(node.getAnimations({ subtree: true }).map(motion => motion.finished)); });
      const shape = [await measure('[role="listbox"]'), await measure('[role="option"]'), await measure('[role="option"] [data-choice-anatomy]'),
        await measure('[data-slot="popover-content"]')];
      await f.page.keyboard.press("Escape");
      await f.page.getByRole("listbox").waitFor({ state: "hidden" });
      return shape;
    };
    assert.deepEqual(await listbox("[data-after-size]"), await listbox("[data-before]"), "the menu's popover and options are SelectionField's");
    const swatch = (selector: string) => f.page.locator(selector).evaluateAll(nodes => nodes.map(node => getComputedStyle(node, "::before").backgroundColor));
    assert.deepEqual(await swatch("[data-after-tint] label"), await swatch("[data-before] .appearance-tint-rail > label"));
    await f.page.locator("[data-after-theme]").getByText("Light", { exact: true }).click();
    assert.equal(await f.page.locator("[data-theme]").innerText(), "light:1");
    await f.page.locator("[data-after-theme]").getByRole("radio", { name: "Light" }).click();
    assert.equal(await f.page.locator("[data-theme]").innerText(), "light:2", "the chosen card is reported again");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("choice menu: each trigger names the choice and its value; a placeholder stands in until something is chosen", async () => {
  const f = await mounted(`<main style="width:520px;padding:16px">
  {#each ["well", "inline", "contextual"] as trigger}
    <Catalog.Choice presentation="menu" cardinality="one" menuTrigger={trigger} label="Currency" labelVisibility="visible"
      options={[{ value: "ARS", label: "ARS", disabled: false, leading: { kind: "symbol", text: "$" } }, { value: "EUR", label: "EUR", disabled: false }]}
      selected={["ARS"]} disabled={false} required={false} />
  {/each}
  <Catalog.Choice presentation="menu" cardinality="one" menuTrigger="well" label="Delivery" labelVisibility="visible" placeholder="Choose…"
    options={[{ value: "collect", label: "Collect", disabled: false }]} selected={[]} disabled={false} required />
</main>`);
  try {
    assert.deepEqual(await f.page.getByRole("button").evaluateAll(nodes => nodes.map(node => [node.getAttribute("aria-label"),
      node.getAttribute("aria-haspopup"), node.querySelector("[data-choice-symbol]")?.textContent ?? null])), [
      ["Currency · ARS", "listbox", "$"], ["ARS · Currency", "listbox", "$"], ["Currency", "listbox", "$"], ["Delivery · Choose…", "listbox", null],
    ]);
    assert.equal(await f.page.getByRole("button", { name: "Delivery · Choose…" }).getAttribute("aria-describedby") !== null, true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
