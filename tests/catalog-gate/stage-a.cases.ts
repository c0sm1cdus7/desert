// Stage A: one case per escape class, written against the 572b30f tree before any gate work and
// retargeted to the slice-0 layout (same escape class, same required code).
// `expect` is the code the finished gate must raise (escape cases: one future code;
// controls: today's code or its future name). Both the test and the baseline recorder read this list.
import type { GateMode, Mutation, SourceTree } from "./harness.ts";

export type GateCase = Readonly<{
  id: string; title: string; kind: "escape" | "control" | "positive";
  expect: readonly string[]; mode?: GateMode; mutate: Mutation;
}>;

const catalog = "src/svelte/catalog", compositions = `${catalog}/compositions`, foundations = `${catalog}/foundations`;
const accessGateFolder = `${compositions}/access-gate`, accessGate = `${accessGateFolder}/AccessGate.svelte`;
const contentFlow = `${compositions}/content-flow/ContentFlow.svelte`, heading = `${foundations}/heading/Heading.svelte`;
const frameBody = `${catalog}/renderer/frame-body/FrameBody.svelte`;
const sharedStylesheet = `${catalog}/mechanisms/structured-content/structured-content.css`;
const flowScript = "  import Feedback from '../../foundations/feedback/Feedback.svelte';";
const addToFlow = (imports: string, markup: string): Mutation => async tree => {
  await tree.replace(contentFlow, flowScript, `${flowScript}\n${imports}`);
  await tree.append(contentFlow, `\n${markup}\n`);
};
const headingImport = '  import Heading from "../../foundations/heading/Heading.svelte";';
const headingFromFlow = (attributes: string) => addToFlow(headingImport, `<Heading kind="page" text="x" ${attributes} />`);
const vendorButton = "../../../vendor/components/ui/button/index.js";
const accessScript = '  import AccessScreen from "../access-screen/AccessScreen.svelte";';
const importIntoAccessGate = (line: string) => (tree: SourceTree) => tree.replace(accessGate, accessScript, `${accessScript}\n${line}`);
/** Appends to a declared mechanism, so the only violation is the rule itself. */
const stylesheet = (css: string): Mutation => tree => tree.append(sharedStylesheet, `\n${css}`);
const bankVersion = '  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";';

export const stageA: readonly GateCase[] = [
  { id: "P0", title: "the unchanged tree builds", kind: "positive", expect: [], mutate: async () => {} },
  { id: "N02", title: "a composition draws native elements and its own style", kind: "escape", expect: ["COMPOSITION_NATIVE_ELEMENT"],
    mutate: tree => tree.append(accessGate, '\n<div style="position:fixed"><h1>x</h1></div>\n<style>div { color: red; }</style>\n') },
  { id: "N03", title: "a registered composition invents a chart element", kind: "escape", expect: ["COMPOSITION_NATIVE_ELEMENT"],
    mutate: tree => tree.replace(`${compositions}/summary-widget/SummaryWidget.svelte`, "\n<style>", '\n<span class="widget-chart2"></span>\n<style>') },
  { id: "N05", title: "a composition imports the vendor Button", kind: "escape", expect: ["VENDOR_OUTSIDE_OWNER"],
    mutate: addToFlow(`  import { Button } from "${vendorButton}";`, '<Button variant="ghost">x</Button>') },
  { id: "N07", title: "a composition imports the vendor Button through an alias", kind: "escape", expect: ["VENDOR_OUTSIDE_OWNER"],
    mutate: addToFlow(`  import { Root as B } from "${vendorButton}";`, "<B>x</B>") },
  { id: "N08", title: "a class is passed to a catalog piece", kind: "escape", expect: ["PRESENTATION_ESCAPE"], mutate: headingFromFlow('class="x"') },
  { id: "N08b", title: "a class is passed to a catalog piece imported under an alias", kind: "escape", expect: ["PRESENTATION_ESCAPE"],
    mutate: addToFlow('  import { default as H } from "../../foundations/heading/Heading.svelte";', '<H kind="page" text="x" class="x" />') },
  { id: "N09", title: "a style directive is passed to a catalog piece", kind: "escape", expect: ["PRESENTATION_ESCAPE"], mutate: headingFromFlow('style:color="red"') },
  { id: "N10", title: "props are spread onto a catalog piece", kind: "escape", expect: ["PRESENTATION_ESCAPE"], mutate: headingFromFlow("{...resolved}") },
  { id: "N11", title: "a data attribute is passed to a catalog piece", kind: "escape", expect: ["PRESENTATION_ESCAPE"], mutate: headingFromFlow("data-x") },
  { id: "N13", title: "a catalog piece is mounted through svelte:component", kind: "escape", expect: ["COMPOSITION_UNKNOWN_PIECE"],
    mutate: addToFlow(headingImport, '<svelte:component this={Heading} kind="page" text="x" />') },
  { id: "N15", title: "a foundation styles everything with a global selector", kind: "escape", expect: ["CROSS_OWNER_CSS"],
    mutate: tree => tree.replace(heading, "<style>\n", "<style>\n  :global(h1) { color: red; }\n") },
  { id: "N16", title: "a stylesheet targets another owner's slot", kind: "escape", expect: ["CROSS_OWNER_CSS"],
    mutate: tree => tree.append(`${catalog}/foundations/field-well/field-well.css`, '\n[data-slot="button"] { color: red; }\n') },
  { id: "N17", title: "a new stylesheet restyles every button without geometry", kind: "escape", expect: ["CROSS_OWNER_CSS"],
    mutate: stylesheet("button { background: red; border-radius: 0; color: lime; }\n") },
  { id: "N18", title: "a non-.css stylesheet is imported by a foundation", kind: "escape", expect: ["UNDECLARED_VISUAL_SOURCE"],
    mutate: async tree => { await tree.create(`${foundations}/heading/rogue.pcss`, "[data-catalog-workspace] h2 { padding-inline-start: 99px; }\n");
      await tree.replace(heading, "<script lang=\"ts\">\n", '<script lang="ts">\n  import "./rogue.pcss";\n'); } },
  { id: "N21", title: "a .js helper is not an admissible visual source", kind: "escape", expect: ["UNDECLARED_VISUAL_SOURCE"],
    mutate: async tree => { await tree.create(`${accessGateFolder}/rogue.js`, 'export const inject = () => document.body.insertAdjacentHTML("beforeend", "x");\n');
      await importIntoAccessGate('  import { inject } from "./rogue.js";')(tree); } },
  { id: "N21b", title: "an infra helper injects markup", kind: "escape", expect: ["VISUAL_RUNTIME_GLOBAL"],
    mutate: async tree => { await tree.create("src/svelte/infra/rogue-inject.ts", 'export const inject = () => document.body.insertAdjacentHTML("beforeend", "x");\n');
      await importIntoAccessGate('  import { inject } from "../../../infra/rogue-inject.ts";')(tree); } },
  { id: "N22", title: "a composition queries the document", kind: "escape", expect: ["VISUAL_RUNTIME_GLOBAL"],
    mutate: tree => tree.replace(contentFlow, flowScript, `${flowScript}\n  const stray = () => document.getElementById("x");`) },
  { id: "N23", title: "a composition animates an element", kind: "escape", expect: ["VISUAL_RUNTIME_GLOBAL"],
    mutate: tree => tree.replace(contentFlow, flowScript, `${flowScript}\n  const fade = (element: HTMLElement) => element.animate([{ opacity: 0 }], 100);`) },
  { id: "N24", title: "a composition renders raw HTML", kind: "escape", expect: ["COMPOSITION_NATIVE_ELEMENT"],
    mutate: tree => tree.append(accessGate, '\n{@html "<b>x</b>"}\n') },
  { id: "N25", title: "a composition renders a dynamic element", kind: "escape", expect: ["COMPOSITION_NATIVE_ELEMENT"],
    mutate: tree => tree.append(accessGate, '\n<svelte:element this="div">x</svelte:element>\n') },
  { id: "N28", title: "an undeclared Svelte file draws a control", kind: "escape", expect: ["UNDECLARED_VISUAL_SOURCE"],
    mutate: async tree => { await tree.create(`${accessGateFolder}/Rogue.svelte`, '<button style="all: unset">x</button>\n');
      await importIntoAccessGate('  import Rogue from "./Rogue.svelte";')(tree); await tree.append(accessGate, "\n<Rogue />\n"); } },
  { id: "N29", title: "an undeclared font is added", kind: "escape", expect: ["UNDECLARED_VISUAL_SOURCE"],
    mutate: tree => tree.create("src/svelte/vendor/fonts/rogue.woff2", new Uint8Array([0x77, 0x4f, 0x46, 0x32])) },
  { id: "N30", title: "an undeclared SVG is added", kind: "escape", expect: ["UNDECLARED_VISUAL_SOURCE"],
    mutate: tree => tree.create(`${accessGateFolder}/rogue.svg`, '<svg xmlns="http://www.w3.org/2000/svg"><rect width="9" height="9"/></svg>\n') },
  { id: "N31", title: "a symlink enters the visual roots", kind: "control", expect: ["VISUAL_SOURCE_SYMLINK"],
    mutate: tree => tree.link(frameBody, "src/build/svelte/linked.svelte") },
  { id: "N32", title: "the HTML template gains markup", kind: "escape", expect: ["UNQUALIFIED_ARTIFACT"],
    mutate: tree => tree.replace("src/build/svelte/template/src/app.html", "<body><div>", '<body><div style="background:red">x</div><div>') },
  { id: "N33", title: "the page route gains markup", kind: "escape", expect: ["UNQUALIFIED_ARTIFACT"],
    mutate: tree => tree.append("src/build/svelte/template/src/routes/+page.svelte", '\n<div style="color:red">x</div>\n') },
  { id: "N34", title: "the public catalog page gains markup", kind: "escape", expect: ["UNQUALIFIED_ARTIFACT"],
    mutate: tree => tree.append("src/build/svelte/public-catalog-page.svelte", "\n<marquee>x</marquee>\n") },
  { id: "N35", title: "the Vite configuration gains a plugin", kind: "escape", expect: ["UNQUALIFIED_ARTIFACT"],
    mutate: tree => tree.replace("src/build/svelte/vite.mjs", "  tailwindcss(), sveltekit(),", '  { name: "rogue" }, tailwindcss(), sveltekit(),') },
  { id: "N44", title: "a generated registry is edited by hand", kind: "control", expect: ["WEB_CATALOG_DERIVATION", "CATALOG_DERIVATION"],
    mutate: tree => tree.replace("src/svelte/renderer-registry.ts", 'import TextInput from "./catalog/foundations/text-input/TextInput.svelte";',
      'import TextInput from "./catalog/foundations/text-input/TextInput.svelte";\nimport Rogue from "./catalog/foundations/heading/Heading.svelte";') },
  { id: "N47", title: "relabelling an owner unsealed hides a class escape", kind: "escape", expect: ["PRESENTATION_ESCAPE"],
    mutate: async tree => { await tree.replace("src/svelte/catalog-manifest.ts",
      'Heading: { source: "src/svelte/catalog/foundations/heading/Heading.svelte", closure: "closed" }', 'Heading: { source: "src/svelte/catalog/foundations/heading/Heading.svelte", closure: "unsealed" }');
      await headingFromFlow('class="x"')(tree); } },
  { id: "N49h", title: "the human build family runs the gate before its worker", kind: "control", mode: "project:human",
    expect: ["RENDERER_DOM", "COMPOSITION_NATIVE_ELEMENT"], mutate: tree => tree.append(frameBody, "\n<div>x</div>\n") },
  { id: "N49p", title: "the public-catalog build family runs the gate before its worker", kind: "control", mode: "project:public-catalog",
    expect: ["RENDERER_DOM", "COMPOSITION_NATIVE_ELEMENT"], mutate: tree => tree.append(frameBody, "\n<div>x</div>\n") },
  { id: "N51", title: "deleting a gate module cannot switch the gate off", kind: "escape", expect: ["CATALOG_GATE_SOURCES"],
    mutate: tree => tree.remove("src/authoring/visual-boundary/closed.ts") },
  { id: "C1", title: "a sealed adapter draws a native element", kind: "control", expect: ["RENDERER_DOM", "COMPOSITION_NATIVE_ELEMENT"],
    mutate: tree => tree.append(frameBody, "\n<div>x</div>\n") },
  { id: "C2", title: "a finite-input owner receives a class", kind: "control", expect: ["FINITE_CATALOG_INPUT", "PRESENTATION_ESCAPE"],
    mutate: tree => tree.replace(`${compositions}/catalog-workspace/CatalogWorkspace.svelte`, '<Place bind:owner bind:viewport landmark="main"',
      '<Place bind:owner bind:viewport class="x" landmark="main"') },
  { id: "C3", title: "a sealed adapter imports a visual helper", kind: "control", expect: ["NONVISUAL_DEPENDENCY", "VISUAL_RUNTIME_GLOBAL"],
    mutate: tree => tree.replace(frameBody, bankVersion,
      `${bankVersion}\n  import { observeDockAbove } from "../../../infra/dock-above.ts";\n  void observeDockAbove;`) },
  { id: "C4", title: "a stylesheet gives every button toolbar geometry", kind: "control", expect: ["TOOLBAR_OWNERSHIP", "CROSS_OWNER_CSS"],
    mutate: stylesheet("button { min-height: 12px; }\n") },
];
