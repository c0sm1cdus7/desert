// The navigation pane's destination icons are the Face foundation (laws 9b, 9e; owner decision V1, 2026-10-25: «Face de
// siempre», the coloured group squares asked for on 2026-10-16 are withdrawn). Each destination's slot holds exactly one
// Face at its compact size and paints nothing of its own; the face has the one card-white ground and the one hairline,
// the derived corner, and its colour reaches only the glyph: the accent for a place to browse, positive for the travel
// kit, neutral for the developer bank. Light and dark, docked (1280) and as the overlay pane (390). Writes what it saw
// to artifacts/navigation-face/<NAVIGATION_EVIDENCE|current>/.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte';
  import { viewEventOwnership } from '@desert/web/client/view-events.ts';
  import type { ResolvedView } from '@desert/views/resolved.ts';
  const identity = { title: 'Landmarks', subtitle: 'Places worth a visit.' };
  const resolved: ResolvedView = {
    view: { version: 'desert.view/1', id: 'places', outputs: [], content: [
      { kind: 'header', id: 'heading', ...identity },
      ...Array.from({ length: 6 }, (_, index) => ({ kind: 'stack' as const, id: 'section-' + index, title: 'Region ' + index,
        items: [{ kind: 'text' as const, id: 'text-' + index, text: 'A place to browse, its travel kit and the developer bank.' }] })),
    ] }, bindings: {}, disabledOutputs: [],
  };
</script>
<CatalogWorkspace navigationSurface={{title:'Landmarks',settingsPlaceholder:true}} title={identity.title} {identity} topActions={[]} invoke={()=>{}}
  navigation={[{id:'places',label:'Places',icon:'landmark'},{id:'kit',label:'Travel kit',icon:'backpack'},
    {id:'catalog',label:'Visual catalog',icon:'catalog',group:'Developer',purpose:'utility'}]}
  active="places" query="" searching={false} onsearch={()=>{}} oncancel={()=>{}} onquery={()=>{}} onnavigate={()=>{}}
  content={{kind:'view-program',visited:[{...resolved,owner:viewEventOwnership().sync([],false).main}],activeView:resolved.view.id,
    albums:{},onevent:()=>{},onalbum:()=>{},onactions:()=>{}}} />`;

/** The face's corner, derived from the theme (law 9d): the control radius over the control's height, as a percent. */
async function faceCornerPercent() {
  const tokens = await readFile(new URL("../src/svelte/catalog/mechanisms/theme/tokens.css", import.meta.url), "utf8");
  const control = parseFloat(tokens.match(/--radius-control:(\d*\.?\d+)px;/)![1]!), height = tokens.match(/--control-height:(\d*\.?\d+)(px|rem);/)!;
  return control / (parseFloat(height[1]!) * (height[2] === "rem" ? 16 : 1)) * 100;
}

function read() {
  const token = (value: string) => { const probe = document.createElement("i"); probe.style.color = value; document.body.append(probe);
    const read = getComputedStyle(probe).color; probe.remove(); return read; };
  const inks = { browse: token("var(--primary-text)"), "travel-kit": token("var(--positive)"), bank: token("var(--muted-foreground)") };
  const ground = token("var(--card-base)"), border = token("var(--border)");
  const slots = [...document.querySelectorAll("[data-catalog-navigation] [data-navigation-icon]")].map(slot => {
    const style = getComputedStyle(slot), face = slot.firstElementChild, box = face?.getBoundingClientRect();
    const content = face?.querySelector("[data-face-content]"), hairline = face ? getComputedStyle(face, "::after") : null;
    return { appearance: slot.getAttribute("data-navigation-icon"), children: slot.children.length,
      slot: { background: style.backgroundColor, shadow: style.boxShadow, radius: style.borderRadius, color: style.color },
      face: face && box && hairline ? { piece: face.getAttribute("data-piece"), compact: face.hasAttribute("data-compact"), width: box.width, height: box.height,
        ground: getComputedStyle(face).backgroundColor, radius: getComputedStyle(face).borderRadius,
        hairline: `${hairline.borderTopWidth} ${hairline.borderTopStyle} ${hairline.borderTopColor}`, glyph: content ? getComputedStyle(content).color : null,
        svg: face.querySelector("svg") !== null } : null };
  });
  return { slots, inks, ground, border };
}

const label = process.env.NAVIGATION_EVIDENCE ?? "current";
for (const width of [1280, 390] as const) {
  test(`navigation: each destination icon is the one Face, white ground and hairline, colour on the glyph alone (${width}px)`, { timeout: 90000 }, async () => {
    const f = await svelteBrowser(source, {}, "http://navigation-face.test/");
    const directory = new URL(`../artifacts/navigation-face/${label}/`, import.meta.url);
    const corner = await faceCornerPercent(), failures: string[] = [], report: unknown[] = [];
    try {
      await mkdir(directory, { recursive: true });
      await f.page.addStyleTag({ content: await rendererCss() });
      await f.page.setViewportSize({ width, height: 844 });
      for (const colorScheme of ["light", "dark"] as const) {
        await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        if (width < 960 && !await f.page.locator("[data-catalog-navigation]").isVisible())
          await f.page.getByRole("button", { name: "Show navigation", exact: true }).click();
        await f.page.locator("[data-catalog-navigation]").waitFor({ state: "visible" });
        await f.page.waitForTimeout(300);
        await f.page.screenshot({ path: new URL(`sidebar-${colorScheme}-${width}.png`, directory).pathname });
        const observed = await f.page.evaluate(read);
        report.push({ colorScheme, ...observed });
        const check = (valid: boolean, message: string) => { if (!valid) failures.push(`${colorScheme}: ${message}`); };
        check(observed.slots.map(slot => slot.appearance).join() === "browse,travel-kit,bank", `three destinations, one per appearance (${observed.slots.map(slot => slot.appearance)})`);
        for (const slot of observed.slots) {
          const at = `${slot.appearance}`;
          check(slot.children === 1 && slot.face?.piece === "face", `${at}: the slot holds exactly one Face`);
          check(slot.slot.background === "rgba(0, 0, 0, 0)" && slot.slot.shadow === "none" && slot.slot.radius === "0px", `${at}: the slot paints nothing of its own (${JSON.stringify(slot.slot)})`);
          if (!slot.face) continue;
          check(slot.face.compact && Math.abs(slot.face.width - 24) <= .5 && Math.abs(slot.face.height - 24) <= .5, `${at}: the compact face, 24px square (${slot.face.width}×${slot.face.height})`);
          check(slot.face.ground === observed.ground, `${at}: the face's ground ${slot.face.ground} is the card white ${observed.ground}`);
          check(slot.face.hairline === `1px solid ${observed.border}`, `${at}: the one hairline, not ${slot.face.hairline}`);
          check(slot.face.radius.endsWith("%") && Math.abs(parseFloat(slot.face.radius) - corner) < .01, `${at}: the derived corner ${corner}%, not ${slot.face.radius}`);
          check(slot.face.svg, `${at}: the destination's glyph is drawn`);
          check(slot.face.glyph === observed.inks[slot.appearance as keyof typeof observed.inks], `${at}: the glyph wears its ink ${observed.inks[slot.appearance as keyof typeof observed.inks]}, not ${slot.face.glyph}`);
        }
        check(new Set(observed.slots.map(slot => slot.face?.ground)).size === 1, "every destination face shares one ground");
      }
      await writeFile(new URL(`sidebar-${width}.json`, directory), JSON.stringify(report, null, 2));
      assert.deepEqual(f.errors, []);
      assert.deepEqual(failures, []);
    } finally { await f.close(); }
  });
}

test("navigation: the shell's stylesheet paints no destination icon of its own", async () => {
  const shell = await readFile(new URL("../src/svelte/catalog/foundations/shell/catalog-shell.css", import.meta.url), "utf8");
  const rules = [...shell.matchAll(/\[data-navigation-icon[^{]*\{([^}]*)\}/g)].map(match => match[1]!);
  assert.ok(rules.length >= 1, "the slot has a placing rule");
  for (const rule of rules) assert.doesNotMatch(rule, /background|color|border|box-shadow|radius/, `the slot's rule only places the face: ${rule}`);
});
