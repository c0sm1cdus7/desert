// Rule E: a piece tag passes only the plain props its contract declares (PRESENTATION_ESCAPE).
import assert from "node:assert/strict";
import test from "node:test";
import { ruleE } from "../src/authoring/catalog/gate/presentation.ts";
import { codes, composition, contextOf, foundation } from "./support/catalog-context.ts";

const headingFolder = "src/svelte/catalog/foundations/heading";
const closedContract = `import { Type } from "@sinclair/typebox";
export const C = {
  props: Type.Object({ kind: Type.String(), text: Type.String(), "aria-label": Type.Optional(Type.String()) }, { additionalProperties: false }),
  events: Type.Object({ change: Type.String() }, { additionalProperties: false }),
} as const;\n`;
const withSlot = (files: Record<string, string>) => ({ ...files,
  [`${headingFolder}/heading.catalog.ts`]: (files[`${headingFolder}/heading.catalog.ts`] ?? "")
    .replace("approval:", 'slots: { accessory: { accepts: ["heading"] } }, approval:') });
const heading = (contract = closedContract) => ({ ...foundation("heading", "Heading.svelte", "<script lang=\"ts\">let { text } = $props();</script>\n<h1>{text}</h1>\n"),
  [`${headingFolder}/heading.contract.ts`]: contract });
const directImport = 'import Heading from "../../foundations/heading/Heading.svelte";';
const page = "src/svelte/catalog/compositions/page/Page.svelte";
const pageWith = (markup: string, imports = directImport, extra = "") =>
  composition("page", "Page.svelte", ["heading"], `<script lang="ts">\n  ${imports}\n</script>\n${markup}\n`, extra);
const run = (files: Record<string, string>) => codes(ruleE(contextOf(files)));
const escape = (what: string, path = page) => `PRESENTATION_ESCAPE ${path} ${what}`;
const forbidden = (attribute: string, tag = "Heading") =>
  escape(`<${tag}> passes ${attribute}: a piece takes only the plain props its contract declares; contract: heading`);

test("E control: contract props and events pass, on a closed contract", () => {
  assert.deepEqual(run({ ...heading(), ...pageWith('<Heading kind="page" {text} aria-label="x" onchange={() => {}} />') }), []);
});

test("E control: tags of non-pieces are not rule E's business", () => {
  const files = { ...heading(), ...pageWith('<Dialog.Root class="x" />', 'import { Dialog } from "bits-ui";'),
    "src/svelte/vendor/components/ui/button/button.svelte": "<button></button>\n",
    ...foundation("action", "Action.svelte", '<script lang="ts">\n  import B from "../../../vendor/components/ui/button/button.svelte";\n</script>\n<B class="x" />\n',
      ', vendor: ["button"]') };
  assert.deepEqual(run(files), []);
});

test("E: an attribute the closed contract does not declare is rejected", () => {
  assert.deepEqual(run({ ...heading(), ...pageWith('<Heading kind="page" text="x" presentation="access" />') }),
    [escape("<Heading> passes presentation, which the contract of heading does not declare")]);
});

for (const attribute of ['class="x"', 'style="color: red"', 'style:color="red"', "class:x", "use:x", "transition:x", "in:x", "out:x", "animate:x",
  'role="heading"', "data-x", "bind:this={node}", "bind:kindOf", "on:click", "{@attach x}", "{...resolved}", "children={x}", "elementProps={x}",
  "viewportAttributes={x}"]) {
  test(`E: ${attribute} on a piece is always rejected`, () => {
    const name = attribute.startsWith("{") ? attribute : attribute.split("=")[0] ?? "";
    assert.deepEqual(run({ ...heading(), ...pageWith(`<Heading kind="page" text="x" ${attribute} />`) }), [forbidden(name)]);
  });
}

test("E: an aria attribute the contract does not declare is rejected", () => {
  assert.deepEqual(run({ ...heading(), ...pageWith('<Heading kind="page" text="x" aria-hidden="true" />') }),
    [escape("<Heading> passes aria-hidden, which the contract of heading does not declare")]);
});

test("E: N12 child content passed to a piece is rejected", () => {
  assert.deepEqual(run({ ...heading(), ...pageWith('<Heading kind="page" text="x">children</Heading>') }),
    [escape("<Heading> receives child content, which heading declares no slot for")]);
});

test("E: a snippet for a declared slot passes; an undeclared snippet and an explicit children snippet do not", () => {
  const declared = withSlot({ ...heading(), ...pageWith('<Heading kind="page" text="x">\n  {#snippet accessory()}{/snippet}\n</Heading>') });
  assert.deepEqual(run(declared), []);
  const undeclared = withSlot({ ...heading(), ...pageWith('<Heading kind="page" text="x">{#snippet trailing()}{/snippet}{#snippet children()}{/snippet}</Heading>') });
  assert.deepEqual(run(undeclared), [escape("<Heading> receives snippet trailing, which heading declares no slot for"), forbidden("children")]);
});

test("E: on a stub contract, one violation per tag lists every non-forbidden attribute; forbidden ones stay individual", () => {
  const files = { ...heading("export const C = {} as const;\n"), ...pageWith('<Heading kind="page" text="x" class="y" />\n<Heading kind="page" />') };
  assert.deepEqual(run(files), [
    forbidden("class"),
    escape("<Heading> passes kind, text: the contract of heading declares no props yet"),
    escape("<Heading> passes kind: the contract of heading declares no props yet"),
  ]);
});

test("E: aliases, namespaces and the catalog barrel resolve to the piece", () => {
  const barrel = { "src/svelte/catalog/index.ts": 'export { default as Heading } from "./foundations/heading/Heading.svelte";\n' };
  assert.deepEqual(run({ ...heading(), ...pageWith('<H kind="page" text="x" class="x" />', 'import { default as H } from "../../foundations/heading/Heading.svelte";') }),
    [forbidden("class", "H")]);
  assert.deepEqual(run({ ...heading(), ...barrel, ...pageWith('<Catalog.Heading kind="page" text="x" class="x" />', 'import * as Catalog from "../../index.ts";') }),
    [forbidden("class", "Catalog.Heading")]);
  assert.deepEqual(run({ ...heading(), ...barrel, ...pageWith('<Title kind="page" text="x" class="x" />', 'import { Heading as Title } from "../../index.ts";') }),
    [forbidden("class", "Title")]);
});

test("E: a foundation mounting another foundation and a template route are held to the same law", () => {
  const card = foundation("card", "Card.svelte", `<script lang="ts">\n  ${directImport}\n</script>\n<Heading kind="page" text="x" style:color="red" />\n`);
  const route = "src/build/svelte/template/src/routes/+page.svelte";
  const files = { ...heading(), ...card,
    [route]: '<script lang="ts">\n  import Heading from "../../../../../svelte/catalog/foundations/heading/Heading.svelte";\n</script>\n<Heading kind="page" text="x" class="x" />\n' };
  assert.deepEqual(run(files), [
    escape("<Heading> passes class: a piece takes only the plain props its contract declares; contract: heading", route),
    escape("<Heading> passes style:color: a piece takes only the plain props its contract declares; contract: heading", "src/svelte/catalog/foundations/card/Card.svelte"),
  ]);
});

test("E: a dispatch composition may spread onto a piece (rule D2 owns it), but nothing else", () => {
  const renderer = composition("node-view", "NodeView.svelte", ["heading"],
    `<script lang="ts">\n  ${directImport}\n</script>\n<Heading {...node} class="x" />\n`, ', dispatch: "resolved-node"', "src/svelte/catalog/renderer");
  assert.deepEqual(run({ ...heading(), ...renderer }),
    [escape("<Heading> passes class: a piece takes only the plain props its contract declares; contract: heading", "src/svelte/catalog/renderer/node-view/NodeView.svelte")]);
});

test("E: a piece mounted through {@const} over an imported component table is held to the same law", () => {
  const registry = { "src/svelte/renderer-registry.ts":
    'import Heading from "./catalog/foundations/heading/Heading.svelte";\nexport const table = Object.freeze({ "heading.page": Heading, plain: Heading });\n' };
  const renderer = composition("node-view", "NodeView.svelte", ["heading"],
    '<script lang="ts">\n  import { table } from "../../../renderer-registry.ts";\n</script>\n{#if a}{@const Renderer = table["heading.page"]}<Renderer elementProps={x} kind="page" text="x" />{/if}\n'
    + "{#if b}{@const Renderer = table.plain}<Renderer kind=\"page\" text=\"x\" />{/if}\n<Renderer class=\"outside its block\" />\n",
    ', dispatch: "resolved-node"', "src/svelte/catalog/renderer");
  assert.deepEqual(run({ ...heading(), ...registry, ...renderer }),
    [escape("<Renderer> passes elementProps: a piece takes only the plain props its contract declares; contract: heading", "src/svelte/catalog/renderer/node-view/NodeView.svelte"),
      escape("<Renderer>: a component mounted through an undeclared name cannot be checked; import it from the catalog index", "src/svelte/catalog/renderer/node-view/NodeView.svelte")]);
});

const lookupOwner = (attribute: string) =>
  escape(`<Renderer> passes ${attribute}: a piece takes only the plain props its contract declares; contract: an entry of table`, "src/svelte/catalog/renderer/node-view/NodeView.svelte");
const lookupView = (markup: string, table: string) => ({ ...heading(), "src/svelte/renderer-registry.ts": table,
  ...composition("node-view", "NodeView.svelte", ["heading"],
    `<script lang="ts">\n  import { table } from "../../../renderer-registry.ts";\n  let { node } = $props();\n</script>\n${markup}\n`,
    ', dispatch: "resolved-node"', "src/svelte/catalog/renderer") });

test("E: a computed lookup into a component table mounts one of the table's pieces; the forbidden list holds (E owns it, not D2)", () => {
  const registry = 'import Heading from "./catalog/foundations/heading/Heading.svelte";\nexport const table = Object.freeze({ a: Heading, b: Heading });\n';
  const markup = '{#if node.kind === "a"}{@const Renderer = table[node.kind]}<Renderer kind="page" class="x" style="y" data-x aria-hidden="true" role="r" use:x transition:x bind:this={n} elementProps={p}>x</Renderer>{/if}';
  const view = "src/svelte/catalog/renderer/node-view/NodeView.svelte";
  const expected = [lookupOwner("class"), lookupOwner("style"), lookupOwner("data-x"),
    escape("<Renderer> passes aria-hidden, which the contract of an entry of table does not declare", view),
    lookupOwner("role"), lookupOwner("use:x"), lookupOwner("transition:x"), lookupOwner("bind:this"), lookupOwner("elementProps"),
    escape("<Renderer> receives child content, which an entry of table declares no slot for", view)];
  assert.deepEqual(run(lookupView(markup, registry)), expected);
  assert.deepEqual(run(lookupView(markup, "// Generated; do not edit.\nexport const table = {};\n")), expected);
});

test("E: a {@const} alias of an imported piece, a namespace member or another alias is the piece", () => {
  const card = (markup: string, imports = directImport) =>
    foundation("card", "Card.svelte", `<script lang="ts">\n  ${imports}\n</script>\n${markup}\n`);
  const path = "src/svelte/catalog/foundations/card/Card.svelte";
  const barrel = { "src/svelte/catalog/index.ts": 'export { default as Heading } from "./foundations/heading/Heading.svelte";\n' };
  const expected = (tag: string) => [escape(`<${tag}> passes class: a piece takes only the plain props its contract declares; contract: heading`, path),
    escape(`<${tag}> passes style: a piece takes only the plain props its contract declares; contract: heading`, path)];
  assert.deepEqual(run({ ...heading(), ...card('{#if true}{@const H = Heading}<H kind="page" text="x" class="x" style="y" />{/if}') }), expected("H"));
  assert.deepEqual(run({ ...heading(), ...barrel, ...card('{#if true}{@const H = Catalog.Heading}<H kind="page" text="x" class="x" style="y" />{/if}',
    'import * as Catalog from "../../index.ts";') }), expected("H"));
  assert.deepEqual(run({ ...heading(), ...card('{#if true}{@const H = Heading}{#if true}{@const T = H}<T kind="page" text="x" class="x" style="y" />{/if}{/if}') }), expected("T"));
});

const cardPath = "src/svelte/catalog/foundations/card/Card.svelte";
const cardWith = (markup: string, script = "") =>
  foundation("card", "Card.svelte", `<script lang="ts">\n  ${directImport}\n  import * as Catalog from "../../index.ts";\n  import { table } from "../../../renderer-registry.ts";\n  ${script}\n</script>\n${markup}\n`);
const unchecked = (tag: string, form: string, path = cardPath) =>
  escape(`<${tag}>: a component mounted through ${form} cannot be checked; import it from the catalog index`, path);
const aliasTree = (markup: string, script = "") => ({ ...heading(), ...cardWith(markup, script),
  "src/svelte/catalog/index.ts": 'export { default as Heading } from "./foundations/heading/Heading.svelte";\n',
  "src/svelte/renderer-registry.ts": 'import Heading from "./catalog/foundations/heading/Heading.svelte";\nexport const table = Object.freeze({ a: Heading });\n' });

const computedMounts: readonly (readonly [string, string, string, string?])[] = [
  ["an each binding", "H", '{#each [Heading] as H}<H kind="page" class="x" style="y" />{/each}'],
  ["an each binding", "Heading", '{#each items as Heading}<Heading class="x" />{/each}'],
  ["a script variable", "H2", '<H2 kind="page" class="x" />', "const H2 = Heading;"],
  ["$derived", "H3", '<H3 class="x" />', "let H3 = $derived(Heading);"],
  ["svelte:component", "svelte:component", '<svelte:component this={Heading} class="x" />'],
  ["a snippet parameter", "C", '{#snippet row(C)}<C class="x" />{/snippet}'],
  ["a snippet", "Local", '<Local class="x" />\n{#snippet Local()}{/snippet}'],
  ["an await binding", "H", '{#await load then H}<H class="x" />{/await}'],
  ["a computed {@const}", "C", '{#if true}{@const C = flag ? Heading : Heading}<C class="x" />{/if}'],
  ["a computed {@const}", "R", '{#if true}{@const R = table[key]}<R class="x" />{/if}'],
  ["a {@const} destructure", "H", '{#if true}{@const { H } = { H: Heading }}<H class="x" />{/if}'],
  ["a {@const} namespace alias", "C.Heading", '{#if true}{@const C = Catalog}<C.Heading class="x" />{/if}'],
  ["a local object member", "tb.a", '<tb.a class="x" />', "const tb = { a: Heading };"],
  ["a prop", "Icon", '<Icon class="x" />', "let { Icon } = $props();"],
  ["a script variable", "H", '{#if true}{@const H = H4}<H class="x" />{/if}', "const H4 = Heading;"],
];
for (const [form, tag, markup, script] of computedMounts) {
  test(`E: in a foundation, a component mounted through ${form} (${markup}) is refused`, () => {
    assert.deepEqual(run(aliasTree(markup, script)), [unchecked(tag, form)]);
  });
}

test("E: the direct forms stay legal in a foundation: an import, a namespace member, a {@const} alias, a static table entry", () => {
  const legal = '{#if true}{@const H = Heading}{@const T = Catalog.Heading}{@const E = table.a}<H kind="page" class="x" /><T class="x" /><E class="x" />{/if}'
    + '<Heading class="x" /><Catalog.Heading class="x" />';
  const forbiddenClass = (tag: string) => escape(`<${tag}> passes class: a piece takes only the plain props its contract declares; contract: heading`, cardPath);
  assert.deepEqual(run(aliasTree(legal)), ["H", "T", "E", "Heading", "Catalog.Heading"].map(forbiddenClass));
});

test("E: a dispatcher's computed lookup into an imported table stays a table mount, not an unchecked one", () => {
  const registry = 'import Heading from "./catalog/foundations/heading/Heading.svelte";\nexport const table = Object.freeze({ a: Heading });\n';
  assert.deepEqual(run(lookupView('{@const Renderer = table[node.kind]}<Renderer kind="page" />', registry)), []);
});

const listFolder = "src/svelte/catalog/foundations/list";
const list = (slots = '{ children: { accepts: ["heading"] } }') => {
  const files = foundation("list", "List.svelte", "<script lang=\"ts\">let { children } = $props();</script>\n{@render children?.()}\n");
  const declaration = `${listFolder}/list.catalog.ts`;
  return { ...files, [declaration]: (files[declaration] ?? "").replace("approval:", `slots: ${slots}, approval:`) };
};
const card = foundation("card", "Card.svelte", "<div></div>\n");
const listImports = `${directImport}\n  import List from "../../foundations/list/List.svelte";\n  import Card from "../../foundations/card/Card.svelte";`;
const slotTree = (markup: string, slots?: string) => ({ ...heading(), ...withSlot(heading()), ...list(slots), ...card, ...pageWith(markup, listImports) });

test("E: child content is legal when the piece declares a children slot, and its pieces are the slot's accepted ids", () => {
  assert.deepEqual(run(slotTree('<List><Heading kind="page" text="x" /><p>raw text is rule D\'s</p></List>')), []);
  assert.deepEqual(run(slotTree('<List>{#snippet children()}<Heading kind="page" text="x" />{/snippet}</List>')), []);
  assert.deepEqual(run(slotTree('<Heading kind="page" text="x">{#snippet accessory()}<Heading kind="page" text="y" />{/snippet}</Heading>')), []);
});

test("E: a piece the slot does not accept is rejected, through elements and blocks, in children and in named slots", () => {
  assert.deepEqual(run(slotTree('<List><Card /><div>{#if a}<Card />{/if}</div></List>')), [
    escape("<List> slot children of list accepts heading; got card"), escape("<List> slot children of list accepts heading; got card")]);
  assert.deepEqual(run(slotTree('<List>{#snippet children()}<Card />{/snippet}</List>')), [escape("<List> slot children of list accepts heading; got card")]);
  assert.deepEqual(run(slotTree('<Heading kind="page" text="x">{#snippet accessory()}<Card />{/snippet}</Heading>')),
    [escape("<Heading> slot accessory of heading accepts heading; got card")]);
  assert.deepEqual(run(slotTree('<List><Heading kind="page" text="x"><Card /></Heading></List>')),
    [escape("<Heading> receives child content, which heading declares no slot for")]);
});
