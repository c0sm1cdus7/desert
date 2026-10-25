// Rule I: DOM, style and motion facilities run only in a foundation folder, an owned vendor family, or a mechanism a
// foundation owns. Everywhere else under the visual roots a use is VISUAL_RUNTIME_GLOBAL, and so is a build-path import of src/testing.
import assert from "node:assert/strict";
import test from "node:test";
import { ruleI } from "../src/authoring/catalog/gate/dom-access.ts";
import { codes, composition, contextOf, foundation } from "./support/catalog-context.ts";
import { testLayout } from "./support/catalog-layout.ts";

const mechanisms = "src/svelte/catalog/mechanisms", infra = "src/svelte/infra";
const mechanism = (id: string, owner: string, files: Readonly<Record<string, string>>): Record<string, string> => ({
  [`${mechanisms}/${id}/${id}.mechanism.ts`]: `import { defineMechanism } from "x";
export const M = defineMechanism({ id: "${id}", owner: "${owner}", files: ${JSON.stringify(Object.keys(files))} } as const);\n`,
  ...Object.fromEntries(Object.entries(files).map(([name, source]) => [`${mechanisms}/${id}/${name}`, source])),
});
const svelte = (script: string, markup = "") => `<script lang="ts">\n${script}\n</script>\n${markup}\n`;
const field = (markup: string, parts = "") => foundation("field", "Field.svelte", markup, parts);
const flow = (script: string, markup = "") => composition("content-flow", "ContentFlow.svelte", ["field"], svelte(script, markup));
const found = (files: Readonly<Record<string, string>>) => codes(ruleI(contextOf({ ...field("<input />"), ...files })));
const runtime = (path: string, what: string) => `VISUAL_RUNTIME_GLOBAL ${path} ${what}`;
const flowEntry = "src/svelte/catalog/compositions/content-flow/ContentFlow.svelte";
const composed = "a composition owns no DOM (content-flow)", nonvisual = "infra/ must be nonvisual";

test("a foundation, its .svelte.ts part, its vendor family and a mechanism it owns may touch the DOM", () => {
  const files = {
    ...foundation("dock", "Dock.svelte", svelte(`  import { dock } from "./dock.svelte.ts";
  let element: HTMLElement;
  $effect(() => { element.focus(); element.style.setProperty("--x", "1"); dock(element); });`, '<div bind:this={element} onclick={() => element.scrollIntoView()}></div>'),
    ', parts: ["dock.svelte.ts"], vendor: ["sheet"]'),
    "src/svelte/catalog/foundations/dock/dock.svelte.ts": "export const dock = (element: HTMLElement) => element.animate([], 1);\n",
    "src/svelte/vendor/components/ui/sheet/sheet.ts": "export const lock = () => document.body.classList.add('locked');\n",
    ...mechanism("dock-measure", "dock", { "measure.ts": "export const watch = (element: Element) => new ResizeObserver(() => {}).observe(element);\n" }),
    ...mechanism("theme", "theme", { "tokens.css": ":root { --x: 1; }\n" }),
  };
  assert.deepEqual(found(files), []);
});

test("P5: a .ts mechanism owned by one foundation and listed by another foundation runs DOM for both", () => {
  const trap = 'import { trap } from "../../mechanisms/surface-focus/surface-focus.ts";\n  let element: HTMLElement;\n  $effect(() => trap(element));';
  const files = {
    ...foundation("modal", "Modal.svelte", svelte(trap, "<dialog bind:this={element}></dialog>"), ', mechanisms: ["surface-focus"]'),
    ...foundation("popover", "Popover.svelte", svelte(trap, "<div bind:this={element}></div>"), ', mechanisms: ["surface-focus"]'),
    ...mechanism("surface-focus", "modal", { "surface-focus.ts": "export const trap = (element: HTMLElement) => { element.focus(); return document.activeElement; };\n" }),
  };
  assert.deepEqual(found(files), []);
});

test("a class heritage expression is a value: document passed through it, and a node global's document, are DOM", () => {
  assert.deepEqual(found(flow("  let leaked: unknown;\n  class Leak extends ((d: unknown) => (leaked = d, Object))(document) {}")),
    [runtime(flowEntry, `document: ${composed}`)]);
  assert.deepEqual(found(flow('  const title = global.document.title;')), [runtime(flowEntry, `global.document: ${composed}`)]);
  assert.deepEqual(found(flow("  interface Leak extends Pick<Document, \"title\"> {}\n  class Typed implements Partial<typeof document> {}")), []);
});

test("N22 document.getElementById in a composition script", () => {
  assert.deepEqual(found(flow('  const stray = () => document.getElementById("x");')), [runtime(flowEntry, `document.getElementById: ${composed}`)]);
});

test("N23 element.animate in a composition", () => {
  assert.deepEqual(found(flow("  const fade = (element: HTMLElement) => element.animate([{ opacity: 0 }], 100);")),
    [runtime(flowEntry, `element.animate: ${composed}`)]);
});

test("a composition's template expressions are read like its script", () => {
  assert.deepEqual(found(flow("  let target: HTMLElement;", '<Field onfocus={() => target.focus()} label={getComputedStyle(target).color} />')), [
    runtime(flowEntry, `target.focus: ${composed}`), runtime(flowEntry, `getComputedStyle: ${composed}`)]);
});

test("N21b an infra helper injects markup", () => {
  const path = `${infra}/rogue-inject.ts`;
  assert.deepEqual(found({ [path]: 'export const inject = () => document.body.insertAdjacentHTML("beforeend", "x");\n' }), [
    runtime(path, `document.body.insertAdjacentHTML: ${nonvisual}`)]);
});

test("one use per DOM-operation chain: the outermost access; an argument is its own chain", () => {
  const path = `${infra}/chain.ts`;
  assert.deepEqual(found({ [path]: 'export const add = () => { document.body.append(document.createElement("x")); document.body.classList.add("y"); };\n' }), [
    runtime(path, `document.body.append: ${nonvisual}`), runtime(path, `document.createElement: ${nonvisual}`),
    runtime(path, `document.body.classList: ${nonvisual}`)]);
});

test("N52 a DOM-touching .svelte.ts moved from a foundation folder into infra", () => {
  const path = `${infra}/dock.svelte.ts`;
  assert.deepEqual(found({ [path]: "export const watch = (element: Element) => { const size = new ResizeObserver(() => {}); size.observe(element); };\n" }),
    [runtime(path, `new ResizeObserver: ${nonvisual}`)]);
});

test("C3 importing an infra helper is not the violation; the DOM access inside it is", () => {
  const helper = `${infra}/dock-above.ts`;
  assert.deepEqual(found({ ...flow('  import { observeDockAbove } from "../../../infra/dock-above.ts";\n  void observeDockAbove;'),
    [helper]: "export const observeDockAbove = () => requestAnimationFrame(() => {});\n" }), [runtime(helper, `requestAnimationFrame: ${nonvisual}`)]);
});

test("a renderer composition, a theme mechanism script and a mechanism owned by a composition own no DOM", () => {
  const renderer = composition("node-renderer", "NodeRenderer.svelte", ["field"], svelte("  const width = window.innerWidth;"), ', dispatch: "resolved-node"',
    "src/svelte/catalog/renderer");
  const files = { ...renderer, ...mechanism("theme", "theme", { "boot.ts": "export const dark = () => matchMedia('(prefers-color-scheme: dark)');\n" }),
    ...flow(""), ...mechanism("flow-measure", "content-flow", { "measure.ts": "export const read = (element: Element) => element.getBoundingClientRect();\n" }) };
  assert.deepEqual(found(files), [
    runtime("src/svelte/catalog/mechanisms/flow-measure/measure.ts", "element.getBoundingClientRect: mechanism owner content-flow is not a foundation"),
    runtime("src/svelte/catalog/mechanisms/theme/boot.ts", "matchMedia: a theme mechanism owns no script DOM"),
    runtime("src/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte", "window.innerWidth: a renderer composition owns no DOM (node-renderer)"),
  ]);
});

test("build-host component code and an undeclared .js own no DOM", () => {
  const layout = testLayout({ roots: ["src/svelte", "src/build/svelte"], fixed: { "build-host": ["src/build/svelte/host.ts"] } });
  const files = { ...field("<input />"), "src/build/svelte/host.ts": "export const host = (element: HTMLElement) => { element.innerHTML = ''; };\n",
    "src/svelte/catalog/compositions/rogue.js": "export const node = () => globalThis.document;\n" };
  assert.deepEqual(codes(ruleI(contextOf(files, layout))), [
    runtime("src/build/svelte/host.ts", "element.innerHTML: build-host files own no DOM"),
    runtime("src/svelte/catalog/compositions/rogue.js", "globalThis.document: an undeclared file owns no DOM"),
  ]);
});

test("aliases, element access and bare references to the document are uses", () => {
  const path = `${infra}/alias.ts`;
  assert.deepEqual(found({ [path]: `const root = document;
export const mark = (element: Element) => { element["className"] = "x"; root.title = "y"; };
export const style = (element: HTMLElement) => window.getComputedStyle(element);
export const drop = (element: Element) => element.remove();
` }), [runtime(path, `document: ${nonvisual}`), runtime(path, `element.className: ${nonvisual}`), runtime(path, `window.getComputedStyle: ${nonvisual}`),
    runtime(path, `element.remove: ${nonvisual}`)]);
});

test("names that only look like DOM members are not uses", () => {
  const path = `${infra}/plain.ts`;
  assert.deepEqual(found({ [path]: `type Root = typeof document;
export type Host = { scrollTop: () => number; focus: boolean; remove: (record: string, id: string) => string };
export const plain = (host: Host, root?: Root) => ({ style: "x", top: host.scrollTop(), focus: host.focus, removed: host.remove("a", "b"), root });
` }), []);
});

test("a focus scope's focus(key) is a domain call: Element.focus takes only FocusOptions, so a key argument is no DOM use", () => {
  const keyed = "  const scope = useFocusScope();\n  const id = \"a\";\n  const back = () => scope.focus(\"place-title\") || scope.focus(`search:${id}`) || scope.focus(id) || scope.focus(origin.key);";
  assert.deepEqual(found(flow(keyed, '<Field onfocus={() => scope.focus("access-heading")} />')), []);
  const element = "  let target: HTMLElement;\n  const move = () => { target.focus(); target.focus({ preventScroll: true }); };";
  assert.deepEqual(found(flow(element)), [runtime(flowEntry, `target.focus: ${composed}`), runtime(flowEntry, `target.focus: ${composed}`)]);
});

test("N54 a build-path file that imports src/testing is rejected, however it imports it", () => {
  const layout = testLayout({ roots: ["src/svelte", "src/build/svelte"], fixed: { "build-host": ["src/build/svelte/project.ts"] } });
  const files = { ...field('<script lang="ts">\n  import type { Evidence } from "@desert/testing/evidence-project.ts";\n</script>\n<input />'),
    "src/build/svelte/project.ts": 'import { createEvidenceProject } from "../../testing/evidence-project.ts";\nexport const project = createEvidenceProject;\n',
    [`${infra}/late.ts`]: 'export const late = () => import("../../testing/evidence-project.ts");\n' };
  const testOnly = "imports src/testing/evidence-project.ts: test-only code must not enter the build path";
  assert.deepEqual(codes(ruleI(contextOf(files, layout))), [
    runtime("src/build/svelte/project.ts", testOnly),
    runtime("src/svelte/catalog/foundations/field/Field.svelte", testOnly),
    runtime(`${infra}/late.ts`, testOnly),
  ]);
});

// Ported from the previous gate's sealed-adapter globals: a renderer composition selects pieces for data and names no
// browser global at all; its script parts keep only the nonvisual ones (timers, timing, network).
const frame = (script: string, markup = "") => composition("frame-body", "FrameBody.svelte", ["field"], svelte(script, markup), "", "src/svelte/catalog/renderer");
const frameEntry = "src/svelte/catalog/renderer/frame-body/FrameBody.svelte", frameReason = "a renderer composition holds no browser capability";
test("a renderer composition names no browser global, in its scripts or its template", () => {
  assert.deepEqual(found(frame('  fetch("/bank-image.svg");\n  const read = fetch;\n  setTimeout(() => {}, 0);', "<p>{localStorage.length}</p>")), [
    runtime(frameEntry, `fetch: ${frameReason}`), runtime(frameEntry, `fetch: ${frameReason}`), runtime(frameEntry, `setTimeout: ${frameReason}`),
    runtime(frameEntry, `localStorage: ${frameReason}`)]);
  assert.deepEqual(found(frame("  document.write(\"x\");")), [runtime(frameEntry, "document.write: a composition owns no DOM (frame-body)")],
    "a DOM use is reported once, by the DOM law");
});
test("renderer control: type-only DOM names, semantic keys, local and template bindings named like globals are not browser globals", () => {
  assert.deepEqual(found(frame('  let target: HTMLElement | null = null;\n  const semantic = { document: "Notes" };\n  const read = (status: { title: string }) => status.title;\n  let open = $state(false);',
    "{#each items as name}<p>{name} {open} {read(semantic)}</p>{/each}")), []);
});
