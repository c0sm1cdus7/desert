// The scenarios of the previous visual-boundary gate, replayed against the catalog gate on the real tree. Each scenario
// changes real files the way the old test did and must ADD a violation with one of the catalog codes that took the
// assertion over (the unmutated tree carries today's violations, Q1). The old test each block comes from is named.
// Rule N's scenarios (they need files on disk) are in catalog-rule-nonvisual.test.ts; the dispatcher's in
// catalog-rule-dispatch-admission.test.ts; the generated tables' in catalog-generate.test.ts.
import assert from "node:assert/strict";
import test from "node:test";
import { contentRuleIds, contentRules } from "../src/authoring/catalog/gate/content-rules.ts";
import type { ContentRule } from "../src/authoring/catalog/gate/context.ts";
import { added, mutated, realSource } from "./support/real-tree.ts";

/** Every content rule that reads only the visual roots (rules N and U read disk; their scenarios have their own files). */
const onDisk: readonly string[] = ["N", "U"];
const gate: ContentRule = context => contentRuleIds.filter(id => !onDisk.includes(id)).flatMap(id => contentRules[id](context));
type Changes = Readonly<Record<string, string>>;
const catalog = "src/svelte/catalog", compositions = `${catalog}/compositions`, renderer = `${catalog}/renderer`, foundations = `${catalog}/foundations`;
const mechanisms = `${catalog}/mechanisms`;
const flow = `${compositions}/content-flow/ContentFlow.svelte`, frameBody = `${renderer}/frame-body/FrameBody.svelte`;
const shared = `${catalog}/foundations/view-region/view-region.css`;

/** A whole file replaced: compared with the real tree where that file is empty (see `added`). */
type Scenario = Readonly<{ changes: Changes; base?: Changes }>;
const whole = (path: string, source: string): Scenario => ({ changes: { [path]: source }, base: { [path]: "" } });
const append = (path: string, text: string): Changes => ({ [path]: `${realSource(path)}\n${text}\n` });
/** ContentFlow (a composition that uses Text, whose contract is closed) with more imports and markup. */
const inFlow = (imports: string, markup: string): Changes => {
  const source = mutated(flow, '<script lang="ts">\n', `<script lang="ts">\n${imports}\n`)[flow] ?? "";
  return { [flow]: `${source}\n${markup}\n` };
};
const feedback = (attributes: string, content = "") => inFlow("", content ? `<Text text="x" kind="support" ${attributes}>${content}</Text>` : `<Text text="x" kind="support" ${attributes} />`);

/** Each scenario must add a violation with one of `codes` (and `fragment`, when given, in its message). */
function rejects(label: string, scenario: Changes | Scenario, codes: readonly string[], fragment?: string) {
  const { changes, base } = isScenario(scenario) ? scenario : { changes: scenario, base: undefined };
  const found = added(gate, changes, base);
  assert.ok(found.some(line => codes.some(code => line.startsWith(`${code}:`)) && (fragment === undefined || line.includes(fragment))),
    `${label}: expected ${codes.join(" or ")}${fragment ? ` naming "${fragment}"` : ""}; added ${JSON.stringify(found)}`);
}
const isScenario = (value: Changes | Scenario): value is Scenario => typeof Reflect.get(value, "changes") === "object";
const accepts = (label: string, scenario: Changes | Scenario) => {
  const { changes, base } = isScenario(scenario) ? scenario : { changes: scenario, base: undefined };
  assert.deepEqual(added(gate, changes, base), [], label);
};

test("control: the real tree adds nothing, and neither does a closed piece passed its contract props", () => {
  accepts("unchanged", {});
  accepts("Text with its contract props", feedback(""));
});

test("closed-visual-boundaries, composition-owner-boundary, media-*, toolbar-layout-closed: callers pass no presentation to a piece", () => {
  for (const attribute of ['class="p-0"', 'style="--text-page:4px"', "{...resolved}", "bind:this={ref}", 'data-layout="custom"', 'role="alert"',
    "children={foreign}", "viewportAttributes={{}}", "elementProps={{}}", "class:large={true}", 'style:padding="0"', "use:replace", "bind:index",
    "on:click={go}", 'renderer={custom}']) rejects(attribute, feedback(attribute), ["PRESENTATION_ESCAPE"]);
  for (const content of ["<span>HTML</span>", "{#snippet children()}x{/snippet}", "{@render external()}", "{text}", "Content"]) {
    rejects(content, feedback("", content), ["PRESENTATION_ESCAPE", "SLOT_NOT_TYPED", "COMPOSITION_NATIVE_ELEMENT"]);
  }
});

test("closed-visual-boundaries, stylesheet-request-boundary: an alias, a query or a renamed import does not change the piece", () => {
  rejects("alias", inFlow('  import { Text as Renamed } from "../../index.ts";', '<Renamed text="x" kind="body" class="p-0" />'), ["PRESENTATION_ESCAPE"]);
  for (const suffix of ["?audit", "#component", "?svelte&type=script"]) {
    rejects(suffix, inFlow(`  import Foreign from "../../foundations/text/Text.svelte${suffix}";`, '<Foreign text="x" class="foreign" />'),
      ["PRESENTATION_ESCAPE"], "class");
    rejects(suffix, inFlow(`  import Foreign from "../../foundations/text/Text.svelte${suffix}";`, ""), ["COMPOSITION_UNKNOWN_PIECE"], "catalog index");
  }
});

test("closed-visual-boundaries, finite-catalog-inputs: names that hide a piece are unchecked mounts", () => {
  const script = '  import { Text as Bank } from "../../index.ts";';
  for (const markup of ["{#each components as Bank}<Bank />{/each}", "{#each components as { component: Bank }}<Bank />{/each}",
    "{@const Bank = arbitrary}<Bank />", "{#await value then Bank}<Bank />{/await}", "{#snippet nested(Bank)}<Bank />{/snippet}"]) {
    rejects(markup, inFlow(script, markup), ["PRESENTATION_ESCAPE", "COMPOSITION_UNKNOWN_PIECE", "SLOT_NOT_TYPED"]);
  }
  rejects("script alias", inFlow(`${script}\n  const Other = Bank;`, '<Other text="x" />'), ["PRESENTATION_ESCAPE", "COMPOSITION_UNKNOWN_PIECE"]);
  rejects("dynamic", inFlow('  const Component = (await import("../../foundations/text/Text.svelte")).default;', "<Component />"),
    ["COMPOSITION_UNKNOWN_PIECE", "PRESENTATION_ESCAPE"]);
  rejects("missing export", inFlow('  import { Missing } from "../../index.ts";', "<Missing />"), ["COMPOSITION_UNKNOWN_PIECE"]);
  // Svelte refuses a second declaration in one script; across the module and instance scripts the declaration wins.
  const shadowed = mutated(flow, '<script lang="ts">\n', '<script module lang="ts">\n  import { Text as Note } from "../../index.ts";\n</script>\n<script lang="ts">\n  function Note() { return {}; }\n')[flow] ?? "";
  rejects("shadowing declaration", { [flow]: `${shadowed}\n<Note text="x" />\n` }, ["PRESENTATION_ESCAPE"], "shadows");
});

test("closed-visual-boundaries, visual-boundary, view-panel-body, workspace-*, media-inspection: a renderer composition draws nothing", () => {
  for (const path of [frameBody, `${renderer}/panel/Panel.svelte`, `${renderer}/instance-frame/InstanceFrame.svelte`, `${renderer}/view-item/ViewItem.svelte`,
    `${renderer}/media-content/MediaContent.svelte`, `${renderer}/inspection-content/InspectionContent.svelte`, `${renderer}/public-catalog-bank/PublicCatalogBank.svelte`,
    `${renderer}/workspace/Workspace.svelte`, `${renderer}/view-product/ViewProduct.svelte`, `${renderer}/failure-dialog/FailureDialog.svelte`,
    `${renderer}/control-renderer/ControlRenderer.svelte`, `${renderer}/public-catalog-bank-specimen/PublicCatalogBankSpecimen.svelte`]) {
    rejects(`${path} div`, whole(path, "<div />"), ["COMPOSITION_NATIVE_ELEMENT", "DISPATCHER_GRAMMAR"]);
    rejects(`${path} text`, whole(path, "Foreign text"), ["COMPOSITION_NATIVE_ELEMENT", "DISPATCHER_GRAMMAR"]);
    rejects(`${path} style`, whole(path, "<style>div { padding: 3px }</style>"), ["CROSS_OWNER_CSS"]);
    rejects(`${path} html`, whole(path, "{@html markup}"), ["COMPOSITION_NATIVE_ELEMENT", "DISPATCHER_GRAMMAR"]);
    rejects(`${path} button`, append(path, "<button>Foreign</button>"), ["NATIVE_CONTROL_OUTSIDE_FOUNDATION"]);
    rejects(`${path} private import`, whole(path, '<script>import Private from "../../foundations/drawer/Drawer.svelte";</script><Private />'),
      ["COMPOSITION_UNKNOWN_PIECE", "DISPATCHER_GRAMMAR"], "catalog index");
    rejects(`${path} DOM`, whole(path, '<script>document.querySelector("main").style.padding = "0";</script>'), ["VISUAL_RUNTIME_GLOBAL"]);
  }
});

test("closed-visual-boundaries, visual-active-adapters: a renderer composition holds no browser capability and opens no evaluator", () => {
  for (const script of ['document.write("<h1>Foreign UI</h1>")', "const body = document.body;", 'const browser = window; browser.document.write("x")',
    'const browser = self; browser.document.write("x")', 'const browser = globalThis; browser.document.write("x")',
    'const browser = globalThis["window"]; browser.document.write("x")', 'const capability = { document }; capability.document.write("x")',
    'declare const document: any; document.write("x")', "const observer = new MutationObserver(() => {});", 'fetch("/bank-image.svg");',
    'const read = fetch; read("/api/private-media");', "element.style.color = \"red\"", "element.style.setProperty('color', 'red')", "element['animate']([])"]) {
    rejects(script, whole(frameBody, `<script lang="ts">${script}</script>`), ["VISUAL_RUNTIME_GLOBAL"]);
  }
  rejects("module script", whole(frameBody, '<script module>document.write("x")</script>'), ["VISUAL_RUNTIME_GLOBAL"]);
  rejects("template", append(frameBody, '<NodeRenderer node={x} onevent={() => document.write("x")} />'), ["VISUAL_RUNTIME_GLOBAL"]);
  for (const script of ['new Function("document.write(1)")()', "const Execute = Function; new Execute(\"x\")()"]) {
    rejects(script, whole(frameBody, `<script lang="ts">${script}</script>`), ["OPAQUE_SOURCE"]);
  }
  rejects("template import()", append(frameBody, '<NodeRenderer node={x} onevent={() => import("./Anything.svelte")} />'), ["OPAQUE_SOURCE"]);
  accepts("type-only DOM names and semantic keys", mutated(frameBody, "  function dispatch(", '  let target: HTMLElement | null = null;\n  const semantic = { document: "Notes" };\n  void target; void semantic;\n  function dispatch('));
});

test("closed-visual-boundaries: a revealed entry cannot become a native mutation channel", () => {
  // The instance answers whether it revealed the entry (a boolean); whatever a renderer would call on it is still DOM.
  const path = `${renderer}/inspection-content/InspectionContent.svelte`;
  for (const operation of ['target.before("x");', 'target.after("x");', 'target.append("x");', 'target.prepend("x");', 'target.insertAdjacentText("beforeend", "x");',
    'target.textContent = "x";', 'target.innerText = "x";', 'target.replaceWith("x");', "target.remove();", "target.insertBefore(target, null);",
    "target.replaceChild(target, target);", "target.removeChild(target);", 'target["before"]("x");', 'target["textContent"] = "x";', 'target.nodeValue = "x";',
    'target.appendData("x");']) {
    rejects(operation, mutated(path, "return await content?.revealEntry(id) ?? false;", `const target = await content?.revealEntry(id); if (target) { ${operation} } return target ?? false;`),
      ["VISUAL_RUNTIME_GLOBAL"]);
  }
});

test("composition-owner-boundary, visual-private-composition, workspace-*, view-panel-body: a composition renders no public slot or forwarded attributes", () => {
  for (const path of [`${compositions}/view-workspace/ViewWorkspace.svelte`, flow, `${compositions}/media-object/MediaObject.svelte`, `${compositions}/catalog-workspace/CatalogWorkspace.svelte`,
    `${compositions}/catalog-search-results/CatalogSearchResults.svelte`, `${compositions}/fact-group/FactGroup.svelte`, `${compositions}/library/Library.svelte`]) {
    for (const source of ['<script lang="ts">import type { Snippet } from "svelte"; let { children }: { children: Snippet } = $props();</script>{@render children()}',
      "<script>let { content } = $props();</script>{@render content()}", "<script>let { parts } = $props();</script>{@render parts.content()}",
      "{#snippet content()}<p>Local</p>{/snippet}{#snippet outer(content)}{@render content()}{/snippet}",
      "{#snippet content()}<p>Local</p>{/snippet}{#each items as content}{@render content()}{/each}",
      "{#snippet content()}<p>Local</p>{/snippet}{#if yes}{@const content = foreign}{@render content()}{/if}",
      "{#snippet content()}<p>Local</p>{/snippet}{#await promise then content}{@render content()}{/await}"]) {
      rejects(`${path}: ${source}`, whole(path, source), ["SLOT_NOT_TYPED"]);
    }
    rejects(`${path} spread`, whole(path, "<script>let { attrs } = $props();</script><div {...attrs} />"), ["COMPOSITION_NATIVE_ELEMENT"]);
    rejects(`${path} html`, whole(path, "{@html content}"), ["COMPOSITION_NATIVE_ELEMENT"]);
  }
});

test("finite-catalog-inputs, media-inspection, toolbar-boundary: a foundation's props are its contract, never a native API", () => {
  for (const path of [`${foundations}/field/Field.svelte`, `${foundations}/choice/Choice.svelte`, `${foundations}/surface/Surface.svelte`,
    `${foundations}/media-player/MediaPlayer.svelte`, `${foundations}/heading/Heading.svelte`]) {
    for (const source of ['<script lang="ts">import type { HTMLInputAttributes } from "svelte/elements"; let { value }: HTMLInputAttributes = $props();</script><input />',
      '<script lang="ts">let { value, ...rest }: { value: string } = $props();</script><input {...rest} />',
      '<script lang="ts">let { class: css }: { class?: string } = $props();</script><input class={css} />',
      '<script lang="ts">let props: { [key: string]: unknown } = $props();</script><input />',
      "<script>let { children } = $props();</script>{@render children()}"]) {
      rejects(`${path}: ${source}`, whole(path, source), ["FOUNDATION_PROPS"]);
    }
  }
});

test("media-visual-boundary, workspace-owner-boundary: raw HTML in a foundation is opaque; in a composition it is drawing", () => {
  for (const path of [`${foundations}/image/Image.svelte`, `${foundations}/media-player/MediaPlayer.svelte`, `${foundations}/heading/Heading.svelte`]) {
    rejects(path, append(path, "{@html foreign}"), ["OPAQUE_SOURCE"]);
  }
  for (const path of [`${compositions}/media-object/MediaObject.svelte`, `${compositions}/access-gate/AccessGate.svelte`, `${compositions}/lock-screen/LockScreen.svelte`]) {
    rejects(path, append(path, "{@html foreign}"), ["COMPOSITION_NATIVE_ELEMENT"]);
  }
});

test("renderer-bootstrap-boundary: the layout imports the theme and renders exactly SvelteKit's child", () => {
  const layout = "src/build/svelte/template/src/routes/+layout.svelte", source = realSource(layout);
  accepts("comment", { [layout]: `<!-- bootstrap, not another renderer -->\n${source}` });
  for (const changed of [source.replace("@desert/svelte/theme.css", "./other.css"), source.replace('import "@desert/svelte/theme.css";', ""),
    source.replace('import "@desert/svelte/theme.css";', 'import "@desert/svelte/theme.css"; import "./other.css";'),
    source.replace("children: Snippet", "children: Snippet; class?: string"), source.replace("children: Snippet", "children: any"),
    source.replace("{ children }", "{ children, ...rest }"), source.replace("$props()", "$props<any>()"),
    source.replace("</script>", 'document.write("<div>Foreign UI</div>");</script>'),
    source.replace("</script>", "const other = children;</script>").replace("{@render children()}", "{@render other()}"),
    source.replace("{@render children()}", "<main>{@render children()}</main>"), source.replace("{@render children()}", "{@render children()}<span>Extra text</span>"),
    source.replace("{@render children()}", "{@render children()} {@render children()}"), source.replace("{@render children()}", '{@html "<div>Foreign UI</div>"}'),
    `${source}<style>:global(body) { color: red; }</style>`, `${source}<script module>export const arbitrary = true;</script>`]) {
    assert.notEqual(changed, source);
    rejects(changed, { [layout]: changed }, ["UNQUALIFIED_ARTIFACT", "CROSS_OWNER_CSS", "OPAQUE_SOURCE"]);
  }
});

test("stylesheet-request-boundary: a stylesheet in any language, any query, any import form is not a composition's", () => {
  const path = `${renderer}/view-product/ViewProduct.svelte`;
  for (const extension of ["css", "less", "scss", "styl", "pcss", "postcss"]) for (const suffix of ["", "?inline", "?raw", "?url", "#theme"]) {
    const request = `../../../theme.${extension}${suffix}`;
    for (const statement of [`import "${request}";`, `import stylesheet from "${request}";`, `export { default as stylesheet } from "${request}";`, `export * from "${request}";`]) {
      rejects(statement, mutated(path, '<script lang="ts">\n', `<script module>${statement}</script>\n<script lang="ts">\n`), ["CROSS_OWNER_CSS"], "compositions own no CSS");
    }
  }
  rejects("require", mutated(path, '<script lang="ts">\n', '<script lang="ts">\n  require("../../../theme.css");\n'), ["OPAQUE_SOURCE", "CROSS_OWNER_CSS"]);
  accepts("a data module with a query", mutated(path, '<script lang="ts">\n', '<script lang="ts">\n  import type { Surface } from "../../../../web/types.ts?metadata";\n'));
});

test("toolbar-boundary, toolbar-indirect-ownership, toolbar-title-ownership: no stylesheet restyles what the toolbar draws", () => {
  for (const css of [":global(.workspace-header) { padding: 0 }", ':global([data-piece="toolbar"] .toolbar-row) { gap: 1px }',
    ":global([data-date-calendar] [data-toolbar-controls] button) { width: 36px }", "[data-catalog-workspace] h2 { padding-inline-start: 99px; }",
    "[data-catalog-workspace] * { padding: 99px; }", "[data-catalog-workspace] :where(*) { padding: 99px; }", "[data-toolbar-title] { PADDING: 99px }",
    "[data-toolbar-title] { \\70 adding: 99px }", "[data-toolbar-identity] { padding-inline-start: 11px }", "[data-toolbar-heading] { translate: 99px }",
    ".toolbar-heading { order: 99 }", "[data-catalog-toolbar] .toolbar-row button { height: 20px }",
    ":global { [data-catalog-workspace] { & h2 { padding-inline-start: 99px; } } }", "[data-place-toolbar] { inset: 99px }"]) {
    rejects(css, append(shared, css), ["CROSS_OWNER_CSS"]);
  }
  for (const [path, css] of [[`${mechanisms}/pane-material/pane-material.css`, "h2 { opacity: 0 }"], [`${mechanisms}/control-feedback/control-feedback.css`,
    "@utility control-feedback { h2 { transform: scale(2) } }"], [`${mechanisms}/typography/typography.css`, "h2 { padding: 99px }"], ["src/svelte/theme.css", ":where(*) { padding: 99px }"]] as const) {
    rejects(`${path}: ${css}`, append(path, css), ["CROSS_OWNER_CSS"]);
  }
  rejects("consumer heading override", append(`${compositions}/catalog-workspace/CatalogWorkspace.svelte`, "<style>:global([data-catalog-workspace] h2) { padding-inline-start: 99px; }</style>"),
    ["CROSS_OWNER_CSS"]);
  accepts("a stylesheet naming marks nobody else draws", append(shared, "[data-owned-toolbar-host-example] { position: absolute; inset: 0; }"));
});

test("toolbar-boundary, toolbar-indirect-ownership: a class attribute selector names every class it matches, whatever its operator", () => {
  const reading = `${mechanisms}/typography/typography.css`;
  for (const selector of ['[class~="toolbar-row"]', '[class*="toolbar-r"]', '[class="toolbar-row"]', '[class|="toolbar"]', '[class^="toolbar-ro"]',
    '[class$="ar-row"]', '[class*="TOOLBAR-R" i]', '[CLASS~="toolbar-row" s]', "[class~=toolbar-row]", '[class^="toolbar-row fl"]']) {
    rejects(selector, append(reading, `${selector} { gap: 0 }`), ["CROSS_OWNER_CSS"], ".toolbar-row");
  }
  accepts("a class pattern no other owner draws", append(reading, '[class*="no-owner-draws-this-pattern"] { gap: 0 }'));
  accepts("an operator a class cannot satisfy", append(reading, '[class~="toolbar-row flex-wrap"] { gap: 0 }'));
});

test("toolbar-boundary, toolbar-indirect-ownership: a custom property written from a template expression, directive or style attribute has one writer", () => {
  const markup = ['<span onmouseenter={(e) => e.currentTarget.style.setProperty("--toolbar-gap", "0px")}></span>',
    "{#if ready}{(target.style.setProperty('--toolbar-gap', '0px'), '')}{/if}", '<span style:--toolbar-gap="0px"></span>', '<span style="--toolbar-gap:0px"></span>'];
  for (const item of markup) rejects(item, inFlow("", item), ["CROSS_OWNER_CSS"], "--toolbar-gap");
  rejects("a script constant written from the template", inFlow('  const gap = "--toolbar-" + "gap";',
    '<span onmouseenter={(e) => e.currentTarget.style["setProperty"](gap, "0px")}></span>'), ["CROSS_OWNER_CSS"], "--toolbar-gap");
});

test("toolbar-boundary, toolbar-indirect-ownership: a custom property the toolbar or the reading guide writes has no second writer", () => {
  for (const property of ["--toolbar-inset", "--catalog-toolbar-height", "--place-content-inset", "--place-surface-inset", "--sidebar-width", "--face-size"]) {
    rejects(property, append(shared, `[data-structured] { ${property}: 99px; }`), ["CROSS_OWNER_CSS"], property);
  }
});

test("toolbar-boundary, toolbar-title-ownership: toolbar callers pass data, never markup, text or visual attributes", () => {
  const toolbar = '  import { Bar } from "../../index.ts";';
  for (const markup of ['<Bar class="p-0" />', '<Bar style="padding:0" />', '<Bar style:padding="0" />', "<Bar {...attributes} />",
    '<Bar --toolbar-inset="0" />', '<Bar data-toolbar-title="foreign" />', "<Bar bind:this={element} />",
    "<Bar><span data-product-name>VOID</span></Bar>", "<Bar><h2>Title</h2></Bar>", "<Bar>Raw title</Bar>"]) {
    rejects(markup, inFlow(toolbar, markup), ["PRESENTATION_ESCAPE", "COMPOSITION_UNKNOWN_PIECE"]);
  }
  rejects("inline variable", inFlow("", '<div style="--catalog-toolbar-height:20px"></div>'), ["COMPOSITION_NATIVE_ELEMENT"]);
  rejects("scripted variable", inFlow('  const set = (element: HTMLElement) => element.style.setProperty("--toolbar-target", "20px");', ""), ["VISUAL_RUNTIME_GLOBAL"]);
});

test("visual-active-adapters, workspace-catalog-boundary: a renderer passes its pieces only what their contracts declare", () => {
  const path = `${renderer}/panel/Panel.svelte`;
  for (const markup of ['<ViewPanel {...props} />', '<ViewPanel class="override" />', "<ViewPanel children={draw} />", "<ViewPanel><div>Override</div></ViewPanel>"]) {
    rejects(markup, append(path, markup), ["PRESENTATION_ESCAPE", "COMPOSITION_NATIVE_ELEMENT"]);
  }
  for (const markup of ["<NodeRenderer node={node} host={host} />", "<NodeRenderer node={node} actionDisclosure={extra} />", '<NodeRenderer node={node} class="p-0" />']) {
    rejects(markup, append(`${renderer}/failure-dialog/FailureDialog.svelte`, markup), ["PRESENTATION_ESCAPE"]);
  }
  rejects("direct import of the dispatcher", whole(`${renderer}/failure-dialog/FailureDialog.svelte`,
    "<script>import Owner from '@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte';</script><Owner node={node} />"), ["COMPOSITION_UNKNOWN_PIECE"], "catalog index");
});
