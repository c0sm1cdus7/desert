// Rules D and D2: a composition draws nothing and mounts only declared pieces from the catalog index
// (COMPOSITION_NATIVE_ELEMENT, COMPOSITION_UNKNOWN_PIECE, SLOT_NOT_TYPED); a dispatcher is one kind chain (DISPATCHER_GRAMMAR).
import assert from "node:assert/strict";
import test from "node:test";
import { ruleD } from "../src/authoring/catalog/gate/composition-template.ts";
import { ruleD2 } from "../src/authoring/catalog/gate/composition-dispatch.ts";
import { codes, composition, contextOf, foundation } from "./support/catalog-context.ts";
import { testLayout } from "./support/catalog-layout.ts";

const index = { "src/svelte/catalog/index.ts": 'export { default as Field } from "./foundations/field/Field.svelte";\n'
  + 'export { default as Action } from "./foundations/action/Action.svelte";\n' };
const field = foundation("field", "Field.svelte", "<input />\n");
const fieldWithSlot = { ...field, "src/svelte/catalog/foundations/field/field.catalog.ts": (field["src/svelte/catalog/foundations/field/field.catalog.ts"] ?? "")
  .replace("approval:", 'slots: { accessory: { accepts: ["action"] } }, approval:') };
const pieces = { ...index, ...fieldWithSlot, ...foundation("action", "Action.svelte", "<button></button>\n") };
const fromIndex = 'import { Field, Action } from "../../index.ts";';
const page = "src/svelte/catalog/compositions/page/Page.svelte";
const pageWith = (markup: string, imports = fromIndex, uses: readonly string[] = ["field", "action"], extra = "") =>
  composition("page", "Page.svelte", uses, `<script lang="ts">\n  ${imports}\n</script>\n${markup}\n`, extra);
const runD = (files: Record<string, string>) => codes(ruleD(contextOf({ ...pieces, ...files })));
const at = (code: string, what: string, path = page) => `${code} ${path} ${what}; composition: page`;
const native = (what: string, path = page) => at("COMPOSITION_NATIVE_ELEMENT", what, path);
const unknown = (what: string, path = page) => at("COMPOSITION_UNKNOWN_PIECE", what, path);
const untyped = (what: string) => at("SLOT_NOT_TYPED", what);

test("D control: pieces from the index inside blocks, comments, whitespace, declared slots and a mounted piece's snippet pass", () => {
  const markup = `<!-- a comment -->
{#if ready}
  {@const label = "x"}
  <Field {label}>
    {#snippet accessory()}<Action />{/snippet}
  </Field>
{:else}
  <Action />
{/if}
{#each items as item (item)}<Action />{:else}<Field />{/each}
{#key version}<Action />{/key}
{#await pending}<Action />{:then value}<Field />{:catch error}<Action />{/await}
{@render header?.()}
{@render footer()}
{#snippet header()}<Action />{/snippet}`;
  assert.deepEqual(runD(pageWith(markup, fromIndex, ["field", "action"], ', slots: { header: { accepts: ["action"] }, footer: { accepts: ["field"] } }')), []);
});

test("D control: aliases and namespace members of the index resolve; own parts may be mounted and obey the same law", () => {
  assert.deepEqual(runD(pageWith('<F /><Catalog.Action />', 'import { Field as F } from "../../index.ts";\n  import * as Catalog from "../../index.ts";')), []);
  const files: Record<string, string> = { ...pageWith("<Row />", 'import Row from "./Row.svelte";'),
    "src/svelte/catalog/compositions/page/Row.svelte": '<script lang="ts">\n  import { Action } from "../../index.ts";\n</script>\n<Action />\n<div></div>\n' };
  files["src/svelte/catalog/compositions/page/page.catalog.ts"] = (files["src/svelte/catalog/compositions/page/page.catalog.ts"] ?? "")
    .replace('entry: "Page.svelte"', 'entry: "Page.svelte", parts: ["Row.svelte"]');
  assert.deepEqual(runD(files), [native("<div>", "src/svelte/catalog/compositions/page/Row.svelte")]);
});

test("D: N02 elements are native drawing; text inside one is the element's, a <style> block is rule G's", () => {
  assert.deepEqual(runD(pageWith('<div style="position:fixed"><h1>x {y}</h1>{#if a}z{/if}</div>\n{#if b}loose{/if}\n<style>div { color: red; }</style>')),
    [native("<div>"), native("<h1>"), native('text "loose"')]);
});

test("D: N04 text, a text expression, nbsp, {@html} (N24), <svelte:element> (N25) and special elements draw or attach to the DOM", () => {
  assert.deepEqual(runD(pageWith('Hello\n{label}\n&nbsp;\n{@html s}\n<svelte:element this="div" />\n<svelte:head></svelte:head>\n<svelte:window />\n<svelte:boundary><Action /></svelte:boundary>')), [
    native('text "Hello"'), native("text {label}"), native('text "&nbsp;"'), native("{@html}"), native("<svelte:element>"),
    native("<svelte:head>"), native("<svelte:window>"), native("<svelte:boundary>")]);
});

test("D: text passed into a mounted piece is rule E's (child content); an element inside it is still drawn here", () => {
  assert.deepEqual(runD(pageWith("<Field>label {x}<span></span></Field>")), [native("<span>")]);
});

test("D: text inside an unknown component is that tag's content: one report, the tag's", () => {
  assert.deepEqual(runD(pageWith("<Gone>label {x}<span></span></Gone>", 'import Gone from "./Gone.svelte";')),
    [unknown('<Gone> from "./Gone.svelte" does not resolve to a declared piece'), native("<span>")]);
});

test("D: N13 <svelte:component> and a computed component are unknown pieces", () => {
  assert.deepEqual(runD(pageWith('<svelte:component this={Field} />\n{#if a}{@const C = Field}<C />{/if}\n<Catalog.Field />')), [
    unknown("<svelte:component>"), unknown("<C> is not an imported piece (a computed component)"),
    unknown("<Catalog.Field> is not an imported piece (a computed component)")]);
});

test("D: a piece outside `uses` is unknown to the composition", () => {
  assert.deepEqual(runD(pageWith("<Field /><Action />", fromIndex, ["field"])), [unknown("<Action> mounts action, which is not in uses")]);
});

test("D: a piece imported by a direct path or through another barrel must come from the catalog index", () => {
  assert.deepEqual(runD(pageWith("<Field />", 'import Field from "../../foundations/field/Field.svelte";')),
    [unknown('import Field from the catalog index, not "../../foundations/field/Field.svelte"')]);
  const barrel = { "src/svelte/adapter.ts": 'export { default as Field } from "./catalog/foundations/field/Field.svelte";\n' };
  assert.deepEqual(runD({ ...barrel, ...pageWith("<Input />", 'import { Field as Input } from "../../../adapter.ts";') }),
    [unknown('import Field from the catalog index, not "../../../adapter.ts"')]);
  assert.deepEqual(runD({ ...barrel, ...pageWith("<Adapter.Field />", 'import * as Adapter from "../../../adapter.ts";') }),
    [unknown("<Adapter.Field>: import Field from the catalog index")]);
});

test("D: a stray .svelte, a vendor component, a package component and an unresolved import are unknown pieces", () => {
  const files = {
    "src/svelte/stray/Stray.svelte": "<p></p>\n", "src/svelte/vendor/components/ui/button/button.svelte": "<button></button>\n",
    ...pageWith("<Stray /><Button /><Dialog /><Gone />", 'import Stray from "../../../stray/Stray.svelte";\n'
      + '  import Button from "../../../vendor/components/ui/button/button.svelte";\n  import { Dialog } from "bits-ui";\n  import Gone from "./Gone.svelte";') };
  assert.deepEqual(runD(files), [
    unknown("<Stray> resolves to src/svelte/stray/Stray.svelte, which is not a declared piece"),
    unknown("<Button> resolves to src/svelte/vendor/components/ui/button/button.svelte, which is not a declared piece"),
    unknown('<Dialog> from "bits-ui" does not resolve to a declared piece'),
    unknown('<Gone> from "./Gone.svelte" does not resolve to a declared piece')]);
});

test("D: a dynamic import of a component is an unknown piece; nonvisual imports are not rule D's", () => {
  assert.deepEqual(runD(pageWith("<Field />", `${fromIndex}\n  import { tick } from "svelte";\n  import "./x.css";\n  const lazy = import("../../foundations/field/Field.svelte");\n  const any = import(name);`)), [
    unknown('dynamic import of "../../foundations/field/Field.svelte": mount pieces from the catalog index'),
    unknown("dynamic import of a computed module: mount pieces from the catalog index")]);
});

test("D: N26 an undeclared {@render} and N27 a {#snippet} that is not a declared slot are untyped slots", () => {
  assert.deepEqual(runD(pageWith("{@render rows()}\n{#snippet rows()}<Action />{/snippet}\n{@render (pick())()}")), [
    untyped("{@render rows} renders no slot declared by page"), untyped("{#snippet rows} is not a slot declared by page"),
    untyped("{@render a computed snippet} renders no slot declared by page")]);
});

test("D: a snippet passed to an own part is an untyped slot (parts declare no slots)", () => {
  const files: Record<string, string> = { ...pageWith("<Row>{#snippet cell()}<Action />{/snippet}</Row>", `${fromIndex}\n  import Row from "./Row.svelte";`),
    "src/svelte/catalog/compositions/page/Row.svelte": "<!-- part -->\n" };
  files["src/svelte/catalog/compositions/page/page.catalog.ts"] = (files["src/svelte/catalog/compositions/page/page.catalog.ts"] ?? "")
    .replace('entry: "Page.svelte"', 'entry: "Page.svelte", parts: ["Row.svelte"]');
  assert.deepEqual(runD(files), [untyped("{#snippet cell} passed to own part: parts declare no slots")]);
});

test("D: foundations and dispatcher compositions are not rule D's", () => {
  const dispatcher = composition("node-view", "NodeView.svelte", [], "<div></div>\n", ', dispatch: "resolved-node"', "src/svelte/catalog/renderer");
  assert.deepEqual(runD({ ...dispatcher, ...foundation("card", "Card.svelte", "<div>text</div>\n") }), []);
});

// Rule D2.
const registry = "src/svelte/renderer-registry.ts";
const layout = testLayout({ fixed: { "renderer-infrastructure": [registry] } });
const view = "src/svelte/catalog/renderer/node-view/NodeView.svelte";
const dispatcherImports = `${fromIndex}\n  import { nodeRenderers } from "../../../renderer-registry.ts";`;
const dispatcherWith = (markup: string, imports = dispatcherImports, uses: readonly string[] = ["field", "action"]) =>
  composition("node-view", "NodeView.svelte", uses, `<script lang="ts">\n  ${imports}\n  let { node } = $props();\n</script>\n${markup}\n`,
    ', dispatch: "resolved-node"', "src/svelte/catalog/renderer");
const generated = { [registry]: "// Generated from the catalog declarations; do not edit.\nexport const nodeRenderers = {};\n" };
const runD2 = (files: Record<string, string>) => codes(ruleD2(contextOf({ ...pieces, ...generated, ...files }, layout)));
const grammar = (what: string) => `DISPATCHER_GRAMMAR ${view} ${what}; dispatcher: node-view`;
const chain = `{#if node.kind === "input.text"}
  <Field {...node.details} label={node.label} />
{:else if node.kind === "action" || node.kind === "link"}
  <!-- one piece per kind -->
  <Action label={node.label} />
{:else if node.kind === "table"}
  {@const Renderer = nodeRenderers[node.kind]}
  <Renderer node={node} />
{/if}`;

test("D2 control: one kind chain, one index piece or generated-table entry per branch, the node's record spread", () => {
  assert.deepEqual(runD2(dispatcherWith(chain)), []);
});

test("D2: DOM, text, style and blocks inside the dispatcher break the grammar", () => {
  const markup = chain.replace("<Action label={node.label} />", "<Action label={node.label} /><div></div>text\n{#each a as b}<Action />{/each}") + "\n<p></p>\n<style>p {}</style>";
  assert.deepEqual(runD2(dispatcherWith(markup)), [grammar("<div> in a dispatch branch"),
    grammar('text "text" in a dispatch branch'), grammar("{#each} in a dispatch branch"), grammar("<p> outside the kind chain")]);
});

test("D2: a branch that is not a kind test, a second subject, a repeated kind and an {:else} break the chain", () => {
  const markup = `{#if node.kind === "a"}<Action />{:else if node.kind === "b" && node.open}<Action />{:else if other.kind === "c"}<Action />{:else if node.kind === "a"}<Action />{:else}<Field />{/if}`;
  assert.deepEqual(runD2(dispatcherWith(markup)), [grammar('branch test node.kind === "b" && node.open is not <node>.kind === "<kind>"'),
    grammar("branch tests other.kind, not node.kind"), grammar('kind "a" dispatched twice'), grammar("{:else} branch without a kind test")]);
});

test("D2: each branch mounts exactly one piece", () => {
  assert.deepEqual(runD2(dispatcherWith('{#if node.kind === "a"}<Action /><Field />{:else if node.kind === "b"}{/if}')),
    [grammar("branch mounts 2 pieces; each kind mounts exactly one"), grammar("branch mounts 0 pieces; each kind mounts exactly one")]);
});

test("D2: a lookup in a table that is not generated, or a {@const} that is not a lookup, is not a dispatch", () => {
  const handWritten = { [registry]: "export const nodeRenderers = {};\n" };
  assert.deepEqual(runD2({ ...dispatcherWith(chain), ...handWritten }), [
    grammar("{@const Renderer = nodeRenderers[node.kind]} is not a lookup in a generated, typed table"),
    grammar("<Renderer> is not an imported piece (a computed component)")]);
  assert.deepEqual(runD2(dispatcherWith('{#if node.kind === "a"}{@const label = node.label}<Action {label} />{/if}')),
    [grammar("{@const label = node.label} is not a lookup in a generated, typed table")]);
});

test("D2: a foreign spread and pieces outside the index or uses; attributes and children of a table entry are rule E's", () => {
  const markup = `{#if node.kind === "a"}{@const Renderer = nodeRenderers.a}<Renderer elementProps={x} class="y" {...node.details}>x</Renderer>
{:else if node.kind === "b"}<Action {...props} />{:else if node.kind === "c"}<Direct />{:else if node.kind === "d"}<Field />{/if}`;
  assert.deepEqual(runD2(dispatcherWith(markup, `${dispatcherImports}\n  import Direct from "../../foundations/action/Action.svelte";`, ["action"])), [
    grammar('import Action from the catalog index, not "../../foundations/action/Action.svelte"'),
    grammar("spread {...props} onto <Action>: only the node's typed record may be spread"),
    grammar("<Field> mounts field, which is not in uses")]);
});

test("D2: plain compositions are not rule D2's", () => {
  assert.deepEqual(runD2(pageWith("<div></div>")), []);
});
