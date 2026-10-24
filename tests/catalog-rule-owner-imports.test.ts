// Rule F: parts and vendor families are imported only by their owner; a foundation entry takes CatalogProps<id>.
// Codes: FOUNDATION_OUTSIDE_OWNER, VENDOR_OUTSIDE_OWNER, FOUNDATION_PROPS.
import assert from "node:assert/strict";
import test from "node:test";
import { ruleF } from "../src/authoring/catalog/gate/owner-imports.ts";
import { codes, composition, contextOf, foundation } from "./support/catalog-context.ts";
import { testLayout } from "./support/catalog-layout.ts";

const foundations = "src/svelte/catalog/foundations", ui = "src/svelte/vendor/components/ui";
const page = "src/svelte/catalog/compositions/page/Page.svelte";
const props = (id: string) => `let { label }: CatalogProps<"${id}"> = $props();`;
const svelte = (script: string, markup = "") => `<script lang="ts">\n  ${script}\n</script>\n${markup}\n`;
const family = (name: string, extra: Record<string, string> = {}) => ({
  [`${ui}/${name}/index.ts`]: `import Root from "./${name}.svelte";\nexport { Root, Root as Button };\n`,
  [`${ui}/${name}/${name}.svelte`]: svelte('import { cn } from "../../../utils.js";'),
  ...extra,
});
const vendorShared = { "src/svelte/vendor/utils.ts": "export const cn = (...names: string[]) => names.join(\" \");\n" };
const action = (script = 'import { Button } from "../../../vendor/components/ui/button/index.js";', markup = "<Button>{label}</Button>") =>
  ({ ...foundation("action", "Action.svelte", svelte(`${script}\n  ${props("action")}`, markup), ', parts: ["ActionIcon.svelte"], vendor: ["button"]'),
    [`${foundations}/action/ActionIcon.svelte`]: "<i></i>\n" });
const legal = () => ({ ...vendorShared, ...family("button"), ...action() });
const pageImporting = (script: string) => composition("page", "Page.svelte", [], svelte(script));
const layout = testLayout({ fixed: { "vendor-shared": ["src/svelte/vendor/utils.ts"] } });
const run = (files: Record<string, string>) => codes(ruleF(contextOf(files, layout)));
const vendorEscape = (path: string, what: string) => `VENDOR_OUTSIDE_OWNER ${path} ${what}`;

test("F control: owners import their parts and vendor families; vendor files import vendor-shared code", () => {
  const files = { ...legal(), [`${foundations}/action/Action.svelte`]: svelte(
    `import { Button } from "../../../vendor/components/ui/button/index.js";\n  import Icon from "./ActionIcon.svelte";\n  ${props("action")}`, "<Button><Icon /></Button>"),
    [`${ui}/button/extra.svelte`]: svelte('import { Root } from "@desert/svelte/vendor/components/ui/button/index.js";') };
  assert.deepEqual(run(files), []);
});

test("F: a part imported from outside its owner folder is FOUNDATION_OUTSIDE_OWNER, directly or through a barrel", () => {
  const files = { ...legal(), ...pageImporting('import Icon from "../../foundations/action/ActionIcon.svelte";'),
    "src/svelte/infra/icons.ts": 'export { default as Icon } from "../catalog/foundations/action/ActionIcon.svelte";\n' };
  assert.deepEqual(run(files), [
    `FOUNDATION_OUTSIDE_OWNER ${page} imports ActionIcon.svelte, a part of foundation action, from outside its folder`,
    "FOUNDATION_OUTSIDE_OWNER src/svelte/infra/icons.ts imports ActionIcon.svelte, a part of foundation action, from outside its folder",
  ]);
});

test("F: a composition's part is held to the same law", () => {
  const files = { ...legal(), ...composition("panel", "Panel.svelte", [], "<p></p>\n", "", "src/svelte/catalog/compositions"),
    "src/svelte/catalog/compositions/panel/panel.catalog.ts": 'import { defineComposition } from "x";\nimport { C } from "./panel.contract.ts";\n'
      + 'export const K = defineComposition({ id: "panel", purpose: "x", owner: { entry: "Panel.svelte", parts: ["PanelRow.svelte"] }, uses: [], approval: "none", contract: C } as const);\n',
    "src/svelte/catalog/compositions/panel/PanelRow.svelte": "<p></p>\n", ...pageImporting('import Row from "../panel/PanelRow.svelte";') };
  assert.deepEqual(run(files), [`FOUNDATION_OUTSIDE_OWNER ${page} imports PanelRow.svelte, a part of composition panel, from outside its folder`]);
});

test("F: N05 and N07 a composition importing a vendor family, plainly, under an alias or as a namespace", () => {
  const button = "../../../vendor/components/ui/button/index.js", what = "imports vendor family button, owned by foundation action";
  for (const script of [`import { Button } from "${button}";`, `import { Root as B } from "${button}";`, `import * as Group from "${button}";`]) {
    assert.deepEqual(run({ ...legal(), ...pageImporting(script) }), [vendorEscape(page, what)], script);
  }
});

test("F: a vendor component re-exported by a non-vendor barrel is still owned by its foundation", () => {
  const files = { ...legal(), "src/svelte/infra/controls.ts": 'export { Button } from "../vendor/components/ui/button/index.js";\n',
    ...pageImporting('import { Button } from "../../../infra/controls.ts";') };
  assert.deepEqual(run(files), [
    vendorEscape(page, "imports vendor family button, owned by foundation action"),
    vendorEscape("src/svelte/infra/controls.ts", "imports vendor family button, owned by foundation action"),
  ]);
});

test("F: N06 a foundation importing a family another foundation owns; a family importing another owner's family", () => {
  const choice = foundation("choice", "Choice.svelte", svelte(`import * as Slider from "../../../vendor/components/ui/slider/index.js";\n  ${props("choice")}`),
    ', vendor: ["slider"]');
  const files = { ...legal(), ...family("slider"), ...choice,
    [`${foundations}/action/Action.svelte`]: svelte(`import { Root } from "../../../vendor/components/ui/slider/index.js";\n  ${props("action")}`),
    [`${ui}/slider/thumb.svelte`]: svelte('import { Button } from "../button/index.js";') };
  assert.deepEqual(run(files), [
    vendorEscape(`${foundations}/action/Action.svelte`, "imports vendor family slider, owned by foundation choice"),
    vendorEscape(`${ui}/slider/thumb.svelte`, "imports vendor family button, owned by foundation action"),
  ]);
});

test("F: a vendor family owned by the same foundation may import its sibling family", () => {
  const files = { ...vendorShared, ...family("button"), ...family("input-group"), [`${ui}/input-group/addon.svelte`]: svelte('import { Button } from "../button/index.js";'),
    ...action('import { Button } from "../../../vendor/components/ui/button/index.js";'),
    [`${foundations}/action/action.catalog.ts`]: contextless('vendor: ["button", "input-group"]') };
  assert.deepEqual(run(files), []);
});

test("F: a vendor file importing visual code that is not vendor; an undeclared family imported by anyone", () => {
  const files = { ...legal(), [`${ui}/button/extra.svelte`]: svelte('import { focus } from "../../../../infra/focus.ts";'),
    "src/svelte/infra/focus.ts": "export const focus = 1;\n", ...family("orphan"),
    [`${foundations}/action/Action.svelte`]: svelte(`import { Root } from "../../../vendor/components/ui/orphan/index.js";\n  ${props("action")}`) };
  assert.deepEqual(run(files), [
    vendorEscape(`${foundations}/action/Action.svelte`, "imports vendor family orphan, which no foundation owns"),
    vendorEscape(`${ui}/button/extra.svelte`, "vendor family button imports src/svelte/infra/focus.ts, which is not vendor code"),
  ]);
});

for (const [form, declaration] of [
  ["an inline object type", "let { label }: { label: string } = $props();"],
  ["HTML attributes", 'let { label }: HTMLButtonAttributes = $props();'],
  ["a rest element", 'let { label, ...rest }: CatalogProps<"action"> = $props();'],
  ["another piece's props", 'let { label }: CatalogProps<"field"> = $props();'],
  ["no type", "let { label } = $props();"],
  ["a non-destructured binding", 'let all: CatalogProps<"action"> = $props();'],
] as const) {
  test(`F: a foundation entry whose props use ${form} is FOUNDATION_PROPS`, () => {
    const files = { ...legal(), [`${foundations}/action/Action.svelte`]: svelte(declaration) };
    assert.deepEqual(run(files), [`FOUNDATION_PROPS ${foundations}/action/Action.svelte props of foundation action are not \`let { ... }: CatalogProps<"action"> = $props()\``]);
  });
}

test("F: a composition entry and a foundation part are not held to the foundation props form", () => {
  const files = { ...legal(), [`${foundations}/action/ActionIcon.svelte`]: svelte("let { size }: { size: number } = $props();"),
    ...composition("page", "Page.svelte", [], svelte("let { label }: { label: string } = $props();")) };
  assert.deepEqual(run(files), []);
});

test("F: a script-level bag spread onto a vendor component inside a foundation is FOUNDATION_PROPS", () => {
  const script = 'import { Button } from "../../../vendor/components/ui/button/index.js";\n  const rest = {};';
  const markup = "<Button {...rest}>{label}</Button>\n<span {...rest}></span>\n<Button {...(label ? { label } : {})} />\n"
    + "{#snippet trigger({ props })}<Button {...props} />{/snippet}";
  assert.deepEqual(run({ ...legal(), ...action(script, markup) }),
    [`FOUNDATION_PROPS ${foundations}/action/Action.svelte <Button> forwards {...rest} onto vendor family button`]);
});

function contextless(vendor: string) {
  return `import { defineFoundation } from "x";\nimport { C } from "./action.contract.ts";\nexport const F = defineFoundation({ id: "action", purpose: "x", `
    + `owner: { entry: "Action.svelte", parts: ["ActionIcon.svelte"], ${vendor} }, shape: "radius", states: ["default"], approval: "required", contract: C } as const);\n`;
}

// Ported from the previous gate's PRIVATE_VISUAL_IMPORT and nonvisual framework laws: a composition (renderers included)
// and an infra module import only nonvisual packages; visual packages belong to a foundation and its vendor families.
test("F: a composition or an infra module importing a visual package, or Svelte beyond lifecycle and context", () => {
  const infraModule = "src/svelte/infra/focus.ts";
  assert.deepEqual(run({ ...legal(), ...pageImporting('import { mergeProps } from "bits-ui";\n  import Check from "@lucide/svelte/icons/check";\n'
    + '  import { mount, onMount, setContext } from "svelte";\n  import { prefersReducedMotion } from "svelte/motion";\n  import type { Snippet } from "svelte";\n'
    + '  import { Type } from "@sinclair/typebox";\n  import { writable } from "svelte/store";'),
    [infraModule]: 'import { tabbable } from "tabbable";\nexport const first = tabbable;\n' }), [
    `VENDOR_OUTSIDE_OWNER ${page} composition page imports the package bits-ui: visual packages belong to a foundation`,
    `VENDOR_OUTSIDE_OWNER ${page} composition page imports the package @lucide/svelte/icons/check: visual packages belong to a foundation`,
    `VENDOR_OUTSIDE_OWNER ${page} composition page imports mount from svelte: only its lifecycle and context functions`,
    `VENDOR_OUTSIDE_OWNER ${page} composition page imports the package svelte/motion: visual packages belong to a foundation`,
    `VENDOR_OUTSIDE_OWNER ${infraModule} an infra module imports the package tabbable: visual packages belong to a foundation`]);
});
test("F control: a foundation and its vendor family import visual packages", () => {
  assert.deepEqual(run({ ...legal(), ...action('import { Button } from "../../../vendor/components/ui/button/index.js";\n  import Check from "@lucide/svelte/icons/check";') }), []);
});

// P5 (slice 3): a .ts mechanism owned by one foundation is shared with another foundation that lists it in owner.mechanisms;
// nobody else imports it (a composition or infra module reaches it only through a foundation's props, events or methods).
const focusMechanism = {
  "src/svelte/catalog/mechanisms/surface-focus/surface-focus.mechanism.ts": 'import { defineMechanism } from "x";\nexport const M = defineMechanism({ id: "surface-focus", owner: "modal", files: ["surface-focus.ts"] } as const);\n',
  "src/svelte/catalog/mechanisms/surface-focus/surface-focus.ts": "export const trap = (element: HTMLElement) => element.focus();\n",
};
const focusImport = (from: string) => `import { trap } from "${from}mechanisms/surface-focus/surface-focus.ts";`;
const popover = (listed: string) => foundation("popover", "Popover.svelte", svelte(`${focusImport("../../")}\n  ${props("popover")}`, "<div {@attach trap}>{label}</div>"), listed);
const modal = (listed: string) => foundation("modal", "Modal.svelte", svelte(`${focusImport("../../")}\n  ${props("modal")}`, "<dialog {@attach trap}>{label}</dialog>"), listed);

test("F control: foundations that list a foundation-owned .ts mechanism in owner.mechanisms import it, its owner included", () => {
  assert.deepEqual(run({ ...legal(), ...focusMechanism, ...modal(', mechanisms: ["surface-focus"]'), ...popover(', mechanisms: ["surface-focus"]') }), []);
});

test("F: a foundation-owned mechanism imported by a foundation that does not list it, a composition or infra is FOUNDATION_OUTSIDE_OWNER", () => {
  const infraModule = "src/svelte/infra/focus.ts", mechanism = "surface-focus.ts of mechanism surface-focus (owned by foundation modal)";
  assert.deepEqual(run({ ...legal(), ...focusMechanism, ...modal(""), ...popover(', mechanisms: ["surface-focus"]'),
    ...pageImporting(focusImport("../../")), [infraModule]: `${focusImport("../catalog/")}\nexport const focus = trap;\n` }), [
    `FOUNDATION_OUTSIDE_OWNER ${page} imports ${mechanism}; only a foundation that lists it in owner.mechanisms may`,
    `FOUNDATION_OUTSIDE_OWNER src/svelte/catalog/foundations/modal/Modal.svelte imports ${mechanism} without listing surface-focus in owner.mechanisms`,
    `FOUNDATION_OUTSIDE_OWNER ${infraModule} imports ${mechanism}; only a foundation that lists it in owner.mechanisms may`]);
});
