// Law 9d, measured on the bank's own specimens: ONE curvature family. Buttons and controls take the control radius (12px),
// wells the well radius (16px), and every surface or container is concentric with what it holds at its corner: its radius
// is that piece's radius plus the inset between their outer edges (within 1px). Nothing is a capsule except the switch;
// a circle is a person, a dot or the mark of a choice (radio, slider thumb), never a button or a colour swatch. A tag is a mark, not
// a control: its chip takes half the control radius and its remove button is concentric inside it, a corner you can see. A thin line (a track,
// a meter, a grip) has square ends. Writes what it saw to artifacts/curvature-family/<CURVATURE_EVIDENCE|current>/.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const lock = `<Catalog.LockScreen profile={{ login: "sample-identity", displayName: "Sample identity", avatarSeed: "0011223344556677" }} onsubmit={async () => {}} />`;
const money = `<MoneyControl node={{ version: "desert.control/1", kind: "money", id: "budget", label: "Budget", disabled: false, required: false,
  currencies: [{ code: "USD", scale: 2 }, { code: "ARS", scale: 2 }], currency: "USD", minorUnits: "100" }} onevent={() => {}} />`;
const select = `<SelectControl node={{ version: "desert.control/1", kind: "select", id: "pace", label: "Travel pace", required: true, disabled: false,
  value: "slow", options: [{ value: "slow", label: "Slow", disabled: false }, { value: "fast", label: "Fast", disabled: false }, { value: "calm", label: "Calm", disabled: false }] }} onevent={() => {}} />`;
const imports = `import * as Catalog from "@desert/svelte/catalog/index.ts";
  import MoneyControl from "@desert/svelte/catalog/compositions/money-control/MoneyControl.svelte";
  import SelectControl from "@desert/svelte/catalog/compositions/select-control/SelectControl.svelte";
  import Dialog from "@desert/svelte/catalog/compositions/dialog/Dialog.svelte";`;
const bank = (pieces: readonly string[]) => pieces.map(piece => {
  const file = piece.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  return { piece, line: `import { ${piece}Specimens } from "@desert/svelte/catalog/foundations/${file}/${file}.specimens.ts";`,
    body: `<section data-scene-part="${file}" class="part">{#each ${piece}Specimens as specimen}<div class="cell"><Catalog.${piece} {...specimen.props} /></div>{/each}</section>` };
});
const page = (script: string, body: string) => `<script lang="ts">
  ${imports}
  ${script}
</script>
<main data-scene style="padding:16px;background:var(--background);color:var(--foreground)">${body}</main>
<style>
  :global(.part) { display:flex; flex-wrap:wrap; gap:12px; align-items:flex-start; padding:8px 0; }
  :global(.cell) { min-width:0; max-width:100%; }
  :global([data-scene-part="field"] > .cell, [data-scene-part="date-control"] > .cell) { width:min(100%,22rem); }
  :global([data-scene-part="bar"] > .cell) { width:100%; position:relative; }
</style>`;

const controls = bank(["Action", "Bar", "Card", "Tag", "Choice", "Menu", "Slider", "Meter", "Avatar", "Gallery", "MediaPlayer"]);
const fields = bank(["Field", "DateControl"]);
const scenes: Record<string, { source: string; open?: string }> = {
  action: { source: page(controls.filter(part => ["Action", "Card", "Tag", "Menu", "Avatar"].includes(part.piece)).map(part => part.line).join("\n  "),
    controls.filter(part => ["Action", "Card", "Tag", "Menu", "Avatar"].includes(part.piece)).map(part => part.body).join("")) },
  controls: { source: page(controls.filter(part => ["Choice", "Slider", "Meter", "Gallery", "MediaPlayer"].includes(part.piece)).map(part => part.line).join("\n  "),
    controls.filter(part => ["Choice", "Slider", "Meter", "Gallery", "MediaPlayer"].includes(part.piece)).map(part => part.body).join("")) },
  bar: { source: page(controls.filter(part => part.piece === "Bar").map(part => part.line).join(""), controls.filter(part => part.piece === "Bar").map(part => part.body).join("")) },
  field: { source: page(fields.map(part => part.line).join("\n  "), `<section class="part" data-scene-part="lock-screen">${lock}</section>
    <section class="part" data-scene-part="money" style="max-width:420px;display:block">${money}</section>
    <section class="part" data-scene-part="select" style="max-width:420px;display:block">${select}</section>${fields.map(part => part.body).join("")}`) },
  list: { source: page(`import { RowSpecimens } from "@desert/svelte/catalog/foundations/row/row.specimens.ts";
  import { ListSpecimens } from "@desert/svelte/catalog/foundations/list/list.specimens.ts";
  const rows = RowSpecimens.filter(specimen => specimen.props.leading?.kind !== "image");`,
    `<section class="part" data-scene-part="list" style="display:grid">{#each ListSpecimens.filter(specimen => specimen.props.kind === "rows") as specimen}
      <Catalog.List {...specimen.props}>{#each rows as row}<Catalog.Row {...row.props} />{/each}</Catalog.List>{/each}</section>
    <section class="part" data-scene-part="row" style="display:grid;max-width:420px">{#each rows as row}<Catalog.Row {...row.props} />{/each}</section>`) },
  dialog: { source: page("", `<Dialog open={true} locked={false} tone="destructive" face={{ kind: "status", severity: "warning" }} title="Move note to Trash?"
    subtitle="You can restore the note from Trash." secondary={{ label: "Cancel", icon: "back", state: "ready", intent: { kind: "back" } }}
    primary={{ label: "Move to Trash", icon: "archive", state: "ready", intent: { kind: "accept" } }} oninvoke={() => {}} ondismiss={() => {}} />`) },
  // A transient surface holding what an action's surface holds: its top commands and its bottom pair (a bottom sheet with
  // its grip on a phone, a side pane on a wide screen).
  sheet: { source: page(`import { BarSpecimens } from "@desert/svelte/catalog/foundations/bar/bar.specimens.ts";
  const top = BarSpecimens.find(specimen => specimen.variants.purpose === "commands")!, pair = BarSpecimens.find(specimen => specimen.variants.purpose === "commit")!;`,
    `<Catalog.Modal label="Move note" open={true} locked={false} presentation="transient">
      <div style="display:flex;flex-direction:column;flex:1;min-height:0"><Catalog.Bar {...top.props} />
        <p style="flex:1;padding:0 20px">Choose where the note goes.</p><Catalog.Bar {...pair.props} /></div></Catalog.Modal>`) },
  // Choice cards holding each artwork a card frames at its top corners (a picture cover, a wallpaper, a theme preview):
  // the artwork is visibly rounded, at the chip radius (second review: a 1px corner read square in every photo), and the
  // card is the container concentric with it (the artwork's radius plus the card's inset).
  cards: { source: page(`const cards = (label: string, options: readonly Record<string, unknown>[]) => ({ presentation: "cards" as const, cardinality: "one" as const,
    label, labelVisibility: "accessible" as const, selected: [String(options[0]!.value)], disabled: false, required: false, onchange: () => {},
    options: options.map(option => ({ disabled: false, ...option })) });
  const sets = [cards("Cover", [{ value: "audio", label: "Audio", leading: { kind: "artwork", media: "audio" } }, { value: "video", label: "Video", leading: { kind: "artwork", media: "video" } }]),
    cards("Wallpaper", [{ value: "silk", label: "Silk", leading: { kind: "wallpaper", wallpaper: "silk" } }, { value: "mist", label: "Mist", leading: { kind: "wallpaper", wallpaper: "mist" } }]),
    cards("Theme", [{ value: "light", label: "Light", leading: { kind: "theme", mode: "light", tint: "blue", wallpaper: "mist" } }, { value: "dark", label: "Dark", leading: { kind: "theme", mode: "dark", tint: "blue", wallpaper: "mist" } }])];`,
    `{#each sets as set}<section class="part" data-scene-part="cards" style="display:block;max-width:420px"><Catalog.Choice {...set} /></section>{/each}`) },
  // Every image frame (third review): a picture, the notice of one that cannot load and a placeholder, alone and in the
  // galleries that hold them (a detail's photograph included), take the image radius of the family, the control's.
  image: { source: page(`import { ImageSpecimens } from "@desert/svelte/catalog/foundations/image/image.specimens.ts";
  import { GallerySpecimens } from "@desert/svelte/catalog/foundations/gallery/gallery.specimens.ts";
  const photo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' rx='24' fill='%23468'/%3E%3C/svg%3E";
  const galleries = GallerySpecimens.filter(specimen => specimen.props.presentation !== "header");`,
    `<section class="part" data-scene-part="image" style="display:grid;max-width:420px">{#each ImageSpecimens as specimen}<div class="cell" style="height:180px"><Catalog.Image {...specimen.props} /></div>{/each}
      <div class="cell" style="height:180px" data-ready-photo><Catalog.Image source={photo} alt="Harbour" fit="fill" /></div>
      <!-- A notice in a host that gives it no height (a media object's «Media unavailable»): as tall as its sentence and
           inset, never a capsule. -->
      <div class="cell"><Catalog.Image placeholder="unavailable" fallback="Media unavailable" /></div></section>
    <section class="part" data-scene-part="gallery" style="display:grid;max-width:420px">{#each galleries as specimen}<div class="cell"><Catalog.Gallery {...specimen.props} /></div>{/each}</section>`) },
  popover: { source: page("",`<section class="part" data-scene-part="select" style="max-width:420px;display:block">${select}</section>`),
    open: "[data-selection-trigger]" },
  calendar: { source: page("", `<section class="part" data-scene-part="date" style="max-width:420px;display:block"><Catalog.DateControl node={{ version: "desert.control/1",
    kind: "date", id: "arrival", label: "Arrival date", required: true, disabled: false, value: "2026-10-16", minimum: "2026-10-10", maximum: "2026-10-24" }}
    onevent={() => {}} /></section>`), open: '[data-scene-part="date"] button' },
};

/** What the page measures: every rounded box of the scene (portals included), checked against the family. */
function measure() {
  const px = (value: string) => value.endsWith("%") ? NaN : parseFloat(value);
  const root = getComputedStyle(document.documentElement);
  const token = (name: string) => { const probe = document.createElement("i"); probe.style.width = `var(${name})`; document.body.append(probe);
    const read = parseFloat(getComputedStyle(probe).width); probe.remove(); return read; };
  // The owner's numbers (law 9d), not whatever the theme says today.
  const family = { control: 12, well: 16, chip: 6 };
  const failures: string[] = [], seen: string[] = [];
  for (const [role, variable] of [["control", "--radius-control"], ["well", "--radius-well"], ["chip", "--radius-chip"]] as const)
    if (token(variable) !== family[role]) failures.push(`the theme's ${variable} is ${token(variable)}px, not the ${role} radius ${family[role]}px`);
  void root;
  const name = (element: Element) => `${element.tagName.toLowerCase()}${element.getAttribute("data-slot") ? `[${element.getAttribute("data-slot")}]` : ""}`
    + `.${[...element.classList].filter(item => /^[a-z-]+$/.test(item)).slice(0, 3).join(".")}`;
  const corners = (style: CSSStyleDeclaration) => [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius];
  const visible = (element: Element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0
    && element.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && element.closest(".sr-only") === null; };
  // A circle is a person (law 9e), a dot, or the mark of a choice; anything else that is round is a capsule.
  const circle = '[data-slot="avatar"][data-shape="person"], [data-slot="avatar"][data-shape="person"] *, .shuffle, .attention-indicator, .color-bullet, .gallery-dot, [data-slot="radio-group-item"], [data-slot="radio-group-item"] *, [data-slot="slider-thumb"], [data-selection-mark="single"], [data-selection-mark="single"] *, [data-slot="switch"], [data-slot="switch"] *';
  const well = '.field-well, [data-search-field], [data-slot="input-group"]';
  const control = '[data-slot="button"]:not([data-variant="row"]):not([data-variant="field"]):not(.field-well), [data-slot="input-group-button"], button.card, .card:not([data-choice-option]), [data-menu-label], [data-drawer-grip]';
  const chip = '[data-slot="badge"]';
  const line = '[data-slot="slider-track"], [data-meter] > span[aria-hidden], [data-drawer-grip-mark], [data-slot="skeleton"]';
  const elements = [...document.querySelectorAll("body *")].filter(visible);
  for (const element of elements) {
    const style = getComputedStyle(element), radii = corners(style);
    if (radii.every(value => value === "0px")) continue;
    const box = element.getBoundingClientRect(), short = Math.min(box.width, box.height);
    const values = radii.map(px).filter(value => value > 0), radius = Math.max(...radii.map(value => value.endsWith("%") ? parseFloat(value) / 100 * short : px(value)));
    const label = `${name(element)} ${Math.round(box.width)}×${Math.round(box.height)} radius ${radii.join(" ")}`;
    seen.push(label);
    const fail = (message: string) => failures.push(`${label}: ${message}`);
    const square = Math.abs(box.width - box.height) <= 1;
    if (radius >= short / 2 - .5) {
      if (!square) { if (!element.matches('[data-slot="switch"]')) fail("a capsule: only the switch is a capsule"); continue; }
      if (!element.matches(circle)) { fail("a circle that is not a person, a dot or a choice mark"); continue; }
      continue;
    }
    const expect = (want: number, what: string) => {
      for (const value of values) if (Math.abs(value - Math.min(want, short / 2)) > .5) fail(`${what} radius ${want}px, not ${value}px`);
    };
    if (element.matches(line)) fail("a line has square ends");
    else if (element.matches(well)) expect(family.well, "a well's");
    else if (element.matches(chip)) expect(family.chip, "a tag chip's");
    else if (element.parentElement?.matches(chip) && element.matches("button")) {
      // The remove ✕ is concentric with its chip (third review: at a 4px inset its 2px corner read as a square that does
      // not follow the tag's curve): it stands at one inset from the chip's top, bottom and end, its corner is the chip's
      // radius less that inset, and that corner is one a person sees, at least half the chip's.
      const owner = element.parentElement.getBoundingClientRect(), ownerRadius = px(getComputedStyle(element.parentElement).borderTopRightRadius);
      const insets = [box.top - owner.top, owner.bottom - box.bottom, owner.right - box.right], inset = owner.bottom - box.bottom;
      if (Math.max(...insets) - Math.min(...insets) > .5)
        fail(`the remove button stands at unequal insets (top, bottom, end) ${insets.map(value => Math.round(value * 10) / 10).join(", ")} inside its chip`);
      if (Math.abs(radius - (ownerRadius - inset)) > .5) fail(`the remove corner is the chip's ${ownerRadius} less the inset ${inset}`);
      if (radius < ownerRadius / 2 - .5) fail(`the remove corner ${radius}px is not a corner a person sees (at least half the chip's ${ownerRadius}px)`);
    }
    else if (element.matches(control)) expect(family.control, "a control's");
  }
  // A colour swatch is a choice, not a person (laws 9d, 9e): its colour is a rounded square at the control radius, and its
  // 44px target, whose ring shows selection and focus, is concentric with it (second review: the swatches were circles).
  for (const swatch of document.querySelectorAll(".swatch")) {
    if (!visible(swatch)) continue;
    const dot = getComputedStyle(swatch, "::before"), target = swatch.getBoundingClientRect();
    const length = (value: string, side: number) => value.endsWith("%") ? parseFloat(value) / 100 * side : parseFloat(value);
    const dotRadius = length(dot.borderTopLeftRadius, parseFloat(dot.width)), inset = (target.width - parseFloat(dot.width)) / 2;
    if (Math.abs(dotRadius - family.control) > .5) failures.push(`${name(swatch)}: its colour's corner is ${dot.borderTopLeftRadius}, not the control radius ${family.control}px`);
    const targetRadius = length(getComputedStyle(swatch).borderTopLeftRadius, target.width);
    if (Math.abs(targetRadius - (dotRadius + inset)) > .5) failures.push(`${name(swatch)}: its target's corner ${getComputedStyle(swatch).borderTopLeftRadius} is not concentric (${dotRadius} + ${inset})`);
  }
  // The artwork a choice card frames (its first rounded piece at the top-left corner) takes the chip radius: a corner
  // a person sees, never the 1px a control-radius card less its inset leaves.
  for (const card of document.querySelectorAll('label.card[data-choice-option]')) {
    if (!visible(card)) continue;
    const art = [...card.querySelectorAll(".artwork *")].find(element => visible(element) && px(getComputedStyle(element).borderTopLeftRadius) > 0);
    const radius = art ? px(getComputedStyle(art).borderTopLeftRadius) : 0;
    if (Math.abs(radius - family.chip) > .5) failures.push(`${name(card)} ${card.getAttribute("data-choice-option")}: its artwork's corner is ${radius}px, not the chip radius ${family.chip}px`);
  }
  // An image frame (a picture, its unavailable notice, a placeholder) standing by itself or as a gallery's inline or detail
  // photograph has the control radius and clips what it holds to it; a ready picture's frame paints no backdrop of its own,
  // so nothing lighter shows past the picture's own corners (third review).
  for (const frame of document.querySelectorAll('[data-scene-part="image"] .image, [data-scene-part="image"] .image-placeholder, [data-scene-part="gallery"] .gallery:not(.gallery-header)')) {
    if (!visible(frame)) continue;
    const style = getComputedStyle(frame), at = `${name(frame)} ${frame.getAttribute("data-image-state") ?? ""}`;
    if (Math.abs(px(style.borderTopLeftRadius) - family.control) > .5 || Math.abs(px(style.borderBottomRightRadius) - family.control) > .5)
      failures.push(`${at}: an image frame's corner is ${style.borderTopLeftRadius}, not the control radius ${family.control}px`);
    if (frame.matches(".image, .gallery") && style.overflow !== "hidden") failures.push(`${at}: an image frame paints past its rounded shape (overflow ${style.overflow})`);
  }
  for (const frame of document.querySelectorAll('[data-ready-photo] .image[data-image-state="ready"]'))
    if (getComputedStyle(frame).backgroundColor !== "rgba(0, 0, 0, 0)") failures.push(`${name(frame)}: a ready picture's frame paints a backdrop past the picture's own corners`);
  if (document.querySelector("[data-ready-photo]") && !document.querySelector('[data-ready-photo] .image[data-image-state="ready"]'))
    failures.push("the ready picture never became ready");
  // Concentric containers: at each corner, the rounded piece it holds there sits at the same inset across and down, and the
  // container's radius is that piece's radius plus the inset.
  const containers = [...document.querySelectorAll('.problem, .drawer, .floating-pane, .list, .field-well:has([data-action-accessory]), [data-slot="sidebar-inner"], label.card[data-choice-option]')].filter(visible);
  const pairs: string[] = [];
  for (const container of containers) {
    const outer = container.getBoundingClientRect(), style = getComputedStyle(container);
    const outerRadius = px(style.borderBottomRightRadius);
    let measured = 0;
    for (const [x, y, property] of [["right", "bottom", "borderBottomRightRadius"], ["left", "bottom", "borderBottomLeftRadius"], ["right", "top", "borderTopRightRadius"], ["left", "top", "borderTopLeftRadius"]] as const) {
      let best: { inset: number; across: number; down: number; radius: number; label: string } | undefined;
      for (const inner of container.querySelectorAll("*")) {
        if (!visible(inner)) continue;
        const radius = px(getComputedStyle(inner)[property]);
        if (!(radius > 0)) continue;
        const box = inner.getBoundingClientRect();
        const across = x === "right" ? outer.right - box.right : box.left - outer.left, down = y === "bottom" ? outer.bottom - box.bottom : box.top - outer.top;
        if (across < -.5 || down < -.5) continue;
        const inset = Math.max(across, down);
        if (!best || inset < best.inset - .5) best = { inset, across, down, radius, label: name(inner) };
      }
      if (!best || Math.abs(best.across - best.down) > 1 || best.inset > 40) continue;
      measured++;
      const want = best.radius + best.inset, at = `${name(container)} ${y}-${x}`;
      pairs.push(`${at}: ${px(style[property])} = ${best.label} ${best.radius} + inset ${Math.round(best.inset * 10) / 10}`);
      if (Math.abs(px(style[property]) - want) > 1) failures.push(`${at}: radius ${px(style[property])}px is not concentric with ${best.label} (${best.radius}px + inset ${Math.round(best.inset * 10) / 10}px = ${want}px)`);
    }
    void outerRadius; void measured;
  }
  return { family, failures, pairs, seen: [...new Set(seen)] };
}

const label = process.env.CURVATURE_EVIDENCE ?? "current";
for (const [scene, { source, open }] of Object.entries(scenes)) {
  test(`law 9d · ${scene}: controls 12, wells 16, concentric containers, no capsule`, { timeout: 120000 }, async () => {
    // The theme loads before the pieces, as in the product (third review: loaded after them, its base reset a dialog's
    // action padding and hid that its corner was not concentric with its buttons).
    const f = await svelteBrowser(source, {}, undefined, { initialCss: await rendererCss() });
    const directory = new URL(`../artifacts/curvature-family/${label}/`, import.meta.url);
    const failures: string[] = [], report: unknown[] = [];
    try {
      await mkdir(directory, { recursive: true });
      for (const width of [390, 1280]) for (const colorScheme of ["light", "dark"] as const) {
        await f.page.setViewportSize({ width, height: 900 });
        await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        if (open) {
          await f.page.keyboard.press("Escape");
          await f.page.waitForTimeout(150);
          await f.page.locator(open).first().click();
          await f.page.waitForSelector(".floating-pane, .drawer", { state: "visible" });
        }
        await f.page.waitForTimeout(350);
        await f.page.screenshot({ path: new URL(`${scene}-${colorScheme}-${width}.png`, directory).pathname, fullPage: true });
        if (colorScheme === "dark") continue;
        const observed = await f.page.evaluate(measure);
        report.push({ width, ...observed });
        failures.push(...observed.failures.map(failure => `${width}px · ${failure}`));
        if (["dialog", "sheet", "field", "calendar", "cards"].includes(scene) || (scene === "popover" && width === 1280)) {
          if (!observed.pairs.length) failures.push(`${width}px · ${scene}: no concentric pair was measured`);
        }
      }
      await writeFile(new URL(`${scene}.json`, directory), JSON.stringify(report, null, 2));
      assert.deepEqual(f.errors, []);
      assert.deepEqual([...new Set(failures)], []);
    } finally { await f.close(); }
  });
}
