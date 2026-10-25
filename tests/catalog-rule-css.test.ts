// Rules G and G2: a stylesheet styles only what its owner draws, only its owner loads it, and every utility in the
// emitted CSS comes from a foundation, mechanism or vendor source (CROSS_OWNER_CSS).
import assert from "node:assert/strict";
import test from "node:test";
import { ruleG } from "../src/authoring/catalog/gate/css-ownership.ts";
import { emittedCssViolations } from "../src/authoring/catalog/gate/emitted-css.ts";
import { codes, composition, contextOf as contextOfFiles, foundation } from "./support/catalog-context.ts";
import { testLayout } from "./support/catalog-layout.ts";
import { themeBlockBegin, themeBlockEnd } from "../src/authoring/catalog/theme-stylesheets.ts";

const catalog = "src/svelte/catalog", mechanisms = `${catalog}/mechanisms`, foundations = `${catalog}/foundations`;
const vendor = "src/svelte/vendor/components/ui", theme = "src/svelte/theme.css";
const tokens = `${mechanisms}/theme/tokens.css`, shared = `${mechanisms}/structured-content/structured-content.css`;
const wellCss = `${foundations}/field-well/field-well.css`, wellEntry = `${foundations}/field-well/FieldWell.svelte`;
const heading = `${foundations}/heading/Heading.svelte`, page = `${catalog}/compositions/page/Page.svelte`;
const mechanism = (id: string, owner: string, files: readonly string[]) => ({
  [`${mechanisms}/${id}/${id}.mechanism.ts`]: `import { defineMechanism } from "x";
export const M = defineMechanism({ id: "${id}", owner: "${owner}", files: ${JSON.stringify(files)} } as const);\n` });
/** theme.css's generated block: one import per stylesheet the declarations list (mechanisms, then pieces, each by id). */
const block = (...paths: readonly string[]) => [themeBlockBegin, ...paths.map(path => `@import "./${path.slice("src/svelte/".length)}";`), themeBlockEnd].join("\n");
const declaredSheets = [`${mechanisms}/structured-content/structured-content.css`, `${mechanisms}/well-motion/well-motion.css`,
  `${foundations}/field-well/field-well.css`];
const markedContract = `import { Type } from "@sinclair/typebox";
export const C = { props: Type.Object({}, { additionalProperties: false }), events: Type.Object({}, { additionalProperties: false }),
  marks: ["data-heading-level"] } as const;\n`;

/** A legal tree: theme entry and mechanisms, two foundations with vendor families, one composition. */
const tree = (): Record<string, string> => ({
  [theme]: `@import "tailwindcss";\n@import "./catalog/mechanisms/theme/tokens.css";\n@import "./catalog/mechanisms/structured-content/structured-content.css";
${block(...declaredSheets)}\n:global(.root) { margin: 0; }\n.bank-face { width: 2rem; }\n`,
  ...mechanism("theme", "theme", ["tokens.css"]),
  [tokens]: "@layer base { *, button:disabled { cursor: default; } :global(html) { color: black; } }\n@keyframes spin { from { a: b } to { a: c } }\n",
  ...mechanism("structured-content", "theme", ["structured-content.css"]),
  [shared]: "[data-structured] > .x { margin: 0; }\n",
  ...mechanism("well-motion", "field-well", ["well-motion.css"]),
  [`${mechanisms}/well-motion/well-motion.css`]: '@import "../../foundations/field-well/field-well.css";\n[data-slot="input-group-control"] { transition: none; }\n',
  ...foundation("field-well", "FieldWell.svelte", '<script lang="ts">\n  import "./field-well.css";\n</script>\n<div></div>\n',
    ', parts: ["field-well.css"], vendor: ["input-group"]'),
  [wellCss]: '[data-field-well] [data-slot="input-group-control"] { min-height: 2.75rem; }\n[data-slot="input-group-addon"] { gap: 0; }\n',
  [`${vendor}/input-group/input-group.svelte`]: '<div data-slot="input-group-control"></div>\n<style>[data-slot="input-group-control"] { color: red; }</style>\n',
  [`${vendor}/input-group/input-group-addon.svelte`]: '<script lang="ts">\n  const attributes = { "data-slot": "input-group-addon" };\n</script>\n<div {...attributes}></div>\n',
  ...foundation("action", "Action.svelte", "<div></div>\n", ', vendor: ["button"]'),
  [`${vendor}/button/button.svelte`]: '<script lang="ts">\n  let { "data-slot": slot = "button" } = $props();\n</script>\n<span data-slot={slot}></span>\n',
  ...foundation("heading", "Heading.svelte", "<h1 data-heading-level>x</h1>\n<style>\n  [data-heading-level] { margin: 0; }\n</style>\n"),
  [`${foundations}/heading/heading.contract.ts`]: markedContract,
  ...composition("page", "Page.svelte", ["heading"], '<script lang="ts">\n  import Heading from "../../foundations/heading/Heading.svelte";\n</script>\n<Heading />\n'),
});
/** theme.css is a fixed file of the theme category, as in DESERT's layout. */
const layoutHost = "src/build/svelte/template/src/routes/+layout.svelte";
const contextOf = (files: Record<string, string>) => contextOfFiles(files, testLayout({ roots: ["src/svelte", "src/build/svelte"],
  fixed: { theme: [theme], "build-host": [layoutHost] } }));
const run = (files: Record<string, string>) => codes(ruleG(contextOf(files)));
const cross = (path: string, what: string) => `CROSS_OWNER_CSS ${path} ${what}`;
const append = (files: Record<string, string>, path: string, text: string) => ({ ...files, [path]: `${files[path] ?? ""}${text}` });

test("G control: owners styling their own marks, slots and imports, and the theme styling elements globally, pass", () => {
  assert.deepEqual(run(tree()), []);
});

test("G: :global outside the theme mechanism is rejected (N15)", () => {
  assert.deepEqual(run({ ...tree(), [heading]: "<h1>x</h1>\n<style>\n  :global(.x) { color: red; }\n</style>\n" }),
    [cross(heading, "selector :global(.x) styles outside its component: only the theme mechanism styles globally")]);
});

test("G: :global also fails in a .css file and in a :global block", () => {
  assert.deepEqual(run(append(tree(), wellCss, ":global { .y { color: red; } }\n")),
    [cross(wellCss, "selector :global styles outside its component: only the theme mechanism styles globally")]);
});

test("G: a <style> element in a template styles the whole document", () => {
  assert.deepEqual(run({ ...tree(), [heading]: "<svelte:head><style>.x { color: red; }</style></svelte:head>\n" }),
    [cross(heading, "a <style> element styles the whole document: only the theme mechanism styles globally")]);
});

for (const [selector, element] of [["button", "button"], ["[data-x] > a", "a"], [".x :is(h1, .y)", "h1"], ["*", "*"], [".x > *:hover", "*"]]) {
  test(`G: element selector ${selector} outside the theme mechanism is rejected`, () => {
    assert.deepEqual(run(append(tree(), wellCss, `${selector} { color: red; }\n`)),
      [cross(wellCss, `selector ${selector} names the element ${element}: only the theme mechanism styles elements`)]);
  });
}

test("G: an element selector in a mechanism owned by the theme is still rejected (N17)", () => {
  assert.deepEqual(run(append(tree(), shared, "button { background: red; }\n")),
    [cross(shared, "selector button names the element button: only the theme mechanism styles elements")]);
});

test("G: element selectors in theme.css itself are rejected: the theme's element styles live in its mechanism", () => {
  assert.deepEqual(run(append(tree(), theme, "@layer base { html { color: black; } }\n")),
    [cross(theme, "selector html names the element html: only the theme mechanism styles elements")]);
});

test("G: element selectors inside a nested rule and inside @media are found", () => {
  assert.deepEqual(run(append(tree(), wellCss, "[data-w] { @media (hover: hover) { & svg { color: red; } } }\n")),
    [cross(wellCss, "selector & svg names the element svg: only the theme mechanism styles elements")]);
});

test("G: another owner's vendor slot is rejected (N16)", () => {
  assert.deepEqual(run(append(tree(), wellCss, '[data-slot="button"] { color: red; }\n')),
    [cross(wellCss, 'selector [data-slot="button"] names the slot button of vendor family button, owned by action')]);
});

test("G: a slot is read through CSS escapes and quotes", () => {
  assert.deepEqual(run(append(tree(), wellCss, "[data-\\73lot=button] { color: red; }\n")),
    [cross(wellCss, "selector [data-\\73lot=button] names the slot button of vendor family button, owned by action")]);
});

test("G: a slot no vendor family defines, and a slot pattern, are rejected", () => {
  assert.deepEqual(run(append(tree(), wellCss, '[data-slot="ghost"] { color: red; }\n[data-x]:has(> [data-slot^="input"]) { color: red; }\n')), [
    cross(wellCss, 'selector [data-slot="ghost"] names the slot ghost, which no vendor family defines'),
    cross(wellCss, 'selector [data-x]:has(> [data-slot^="input"]) matches vendor slots by pattern: name one slot of the owner'),
  ]);
});

test("G: a slot styled by the theme is rejected: slots belong to their foundation", () => {
  assert.deepEqual(run(append(tree(), theme, '[data-slot="input-group-control"] { min-height: 1px; }\n')),
    [cross(theme, 'selector [data-slot="input-group-control"] names the slot input-group-control of vendor family input-group, owned by field-well')]);
});

test("G: another piece's contract mark is rejected; the owner may style it", () => {
  assert.deepEqual(run(append(tree(), wellCss, "[data-heading-level] { margin: 1px; }\n")),
    [cross(wellCss, "selector [data-heading-level] names data-heading-level, a mark of heading")]);
});

test("G: a <style> block in a composition is rejected (N14)", () => {
  assert.deepEqual(run({ ...tree(), [page]: `${tree()[page]}<style>\n  .x { color: red; }\n</style>\n` }),
    [cross(page, "composition page has a <style> block: compositions own no CSS")]);
});

test("G: a stylesheet imported by a composition is rejected, through an alias path or a query (N19)", () => {
  for (const specifier of ["../../foundations/field-well/field-well.css", "@desert/svelte/catalog/foundations/field-well/field-well.css?inline", "some-package/x.css"]) {
    const script = `<script lang="ts">\n  import "${specifier}";\n</script>\n<div></div>\n`;
    assert.deepEqual(run({ ...tree(), [page]: script }), [cross(page, `composition page imports the stylesheet ${specifier}: compositions own no CSS`)], specifier);
  }
});

test("G: a foundation importing another owner's stylesheet is rejected", () => {
  const entry = `${foundations}/action/Action.svelte`;
  assert.deepEqual(run({ ...tree(), [entry]: '<script lang="ts">\n  import "../field-well/field-well.css";\n</script>\n<div></div>\n' }),
    [cross(entry, `foundation action imports ${wellCss}, owned by field-well: a stylesheet is imported only by its owner`)]);
});

test("G: a stylesheet @imported by another owner's stylesheet is rejected", () => {
  assert.deepEqual(run(append(tree(), shared, '@import "../../foundations/field-well/field-well.css";\n')),
    [cross(shared, `mechanism structured-content imports ${wellCss}, owned by field-well: a stylesheet is imported only by its owner`)]);
});

test("G: theme.css importing anything but a theme mechanism stylesheet is rejected (N17 new file)", () => {
  const rogue = "src/svelte/rogue.css";
  assert.deepEqual(run({ ...append(tree(), theme, '@import "./rogue.css";\n@import url("./catalog/foundations/field-well/field-well.css") layer(base);\n'),
    [rogue]: "[data-r] { color: red; }\n" }), [
    cross(theme, `theme.css imports ${rogue}, which is not a theme mechanism stylesheet`),
    cross(theme, `theme.css imports ${wellCss}, which is not a theme mechanism stylesheet`),
  ]);
});

test("G (P4e): theme.css's generated block is exactly the declarations' stylesheets, each a declared owner's", () => {
  const withBlock = (lines: string) => ({ ...tree(), [theme]: tree()[theme]!.replace(block(...declaredSheets), lines) });
  // Positive: the block the declarations generate passes (the control tree).
  assert.deepEqual(run(tree()), []);
  // Negative: a missing, a reordered or an undeclared stylesheet; no block at all.
  const differs = cross(theme, "theme.css's generated stylesheet block is not the declarations' stylesheets; run `node scripts/catalog.ts --write`");
  assert.deepEqual(run(withBlock(block(...declaredSheets.slice(0, 2)))), [differs]);
  assert.deepEqual(run(withBlock(block(...declaredSheets.slice().reverse()))), [differs]);
  const rogue = "src/svelte/rogue.css";
  assert.deepEqual(run({ ...withBlock(block(...declaredSheets, rogue)), [rogue]: "[data-r] { color: red; }\n" }), [
    cross(theme, `theme.css's generated block imports ${rogue}, which no declaration lists as its stylesheet`), differs]);
  assert.deepEqual(run(withBlock("")), [cross(theme,
    "theme.css has no generated stylesheet block, so the declarations' stylesheets are not loaded; run `node scripts/catalog.ts --write`")]);
});

test("G (P4e): outside its generated block theme.css still loads only theme mechanism stylesheets", () => {
  assert.deepEqual(run(append(tree(), theme, '@import "./catalog/foundations/field-well/field-well.css";\n')),
    [cross(theme, `theme.css imports ${wellCss}, which is not a theme mechanism stylesheet`)]);
});

test("G: the template host loads theme.css; any other file loading it, or a stylesheet referenced from infra, is rejected", () => {
  const infra = "src/svelte/infra/load.ts", load = 'import "@desert/svelte/theme.css";\n';
  assert.deepEqual(run({ ...tree(), [layoutHost]: `<script lang="ts">\n  ${load}</script>\n`, [infra]: load }),
    [cross(infra, `${infra} imports ${theme}, owned by theme: a stylesheet is imported only by its owner`)]);
  assert.deepEqual(run(append(tree(), wellCss, '@reference "../../mechanisms/theme/tokens.css";\n')),
    [cross(wellCss, `foundation field-well imports ${tokens}, owned by theme: a stylesheet is imported only by its owner`)]);
});

test("G: a package stylesheet is imported only by the theme", () => {
  assert.deepEqual(run(append(tree(), wellCss, '@import "tw-animate-css";\n')),
    [cross(wellCss, "foundation field-well imports the package stylesheet tw-animate-css: only the theme imports package CSS")]);
});

test("G: an unparseable stylesheet is reported, never thrown", () => {
  const found = ruleG(contextOf(append(tree(), wellCss, ".x { color: red;\n")));
  assert.deepEqual(found.map(item => `${item.code} ${item.path}`), [`CROSS_OWNER_CSS ${wellCss}`]);
});

test("G: violations carry the line of the selector", () => {
  const [found] = ruleG(contextOf(append(tree(), wellCss, "\n\nbutton { color: red; }\n")));
  assert.equal(found?.line, 5);
  const [inStyle] = ruleG(contextOf({ ...tree(), [heading]: "<h1>x</h1>\n<style>\n\n  :global(.x) {}\n</style>\n" }));
  assert.equal(inStyle?.line, 4);
});

// G2: the emitted CSS, compared with Tailwind's own scan of each owner's sources.
const emitted = (css: string) => [{ path: "build/_app/immutable/assets/0.abc.css", source: css }];
const g2 = (files: Record<string, string>, css: string) => codes(emittedCssViolations({ cssFiles: emitted(css), context: contextOf(files) }));
const utilities = (classes: string) => ({ ...tree(),
  [wellEntry]: '<div class="rounded-lg md:flex"></div>\n',
  [`${vendor}/button/button.svelte`]: '<span class="group-hover:opacity-50 bg-black/50"></span>\n',
  [page]: `<script lang="ts">\n  import Heading from "../../foundations/heading/Heading.svelte";\n</script>\n<Heading />\n<!-- ${classes} -->\n` });

test("G2 control: utilities that a foundation, mechanism or vendor source uses, hand-written classes, and classes a utility only refers to, pass", () => {
  const css = ".rounded-lg{border-radius:1rem}@media (width>=48rem){.md\\:flex{display:flex}}"
    + ".group-hover\\:opacity-50:is(:where(.group):hover *){opacity:.5}.bg-black\\/50{background:#0008}.bank-face{width:2rem}.svelte-x1y2{color:red}";
  assert.deepEqual(g2(utilities("rounded-lg group bank-face"), css), []);
});

test("G2: a utility only a composition uses reaches the emitted CSS (N20)", () => {
  const css = ".rounded-lg{border-radius:1rem}.rounded-full{border-radius:9999px}@layer utilities{.\\[\\&_svg\\]\\:size-4 svg{width:1rem}}";
  assert.deepEqual(g2(utilities("rounded-full [&_svg]:size-4"), css), [
    cross(page, 'utility class "rounded-full" reaches the emitted CSS only from composition page: no foundation, mechanism or vendor source uses it'),
    cross(page, 'utility class "[&_svg]:size-4" reaches the emitted CSS only from composition page: no foundation, mechanism or vendor source uses it'),
  ]);
});

test("G2: an infra source is not a traceable owner either", () => {
  const files = { ...utilities(""), "src/svelte/infra/tone.ts": 'export const tone = "text-red-500";\n' };
  assert.deepEqual(g2(files, ".text-red-500{color:red}"),
    [cross("src/svelte/infra/tone.ts", 'utility class "text-red-500" reaches the emitted CSS only from infra: no foundation, mechanism or vendor source uses it')]);
});

test("G2: the violation carries the line where the source writes the utility", () => {
  const [found] = emittedCssViolations({ cssFiles: emitted(".rounded-full{border-radius:9999px}"), context: contextOf(utilities("rounded-full")) });
  assert.equal(found?.line, 5);
});

test("G2: a utility no source writes (injected by a plugin or transform) is reported on the emitted CSS", () => {
  const css = ".rounded-lg{border-radius:1rem}\n.injected-glow{box-shadow:0 0 1rem red}\n@media (width>=48rem){.md\\:hidden{display:none}}";
  const found = emittedCssViolations({ cssFiles: emitted(css), context: contextOf(utilities("")) });
  assert.deepEqual(codes(found), [
    cross("build/_app/immutable/assets/0.abc.css", 'utility class "injected-glow" is in the emitted CSS but no owner writes it: no source and no source stylesheet holds it'),
    cross("build/_app/immutable/assets/0.abc.css", 'utility class "md:hidden" is in the emitted CSS but no owner writes it: no source and no source stylesheet holds it'),
  ]);
  assert.deepEqual(found.map(item => item.line), [2, 3]);
});

test("G2: Svelte's scoping classes are the compiler's, at most one per component with a <style>; more, or another shape, need an owner", () => {
  assert.deepEqual(g2(utilities(""), ".rounded-lg.svelte-1abc2de{color:red}.svelte-zz9{margin:0}"), []);
  assert.deepEqual(g2(utilities(""), ".svelte-1abc2de{color:red}.svelte-zz9{margin:0}.svelte-x0{margin:0}"),
    [cross("build/_app/immutable/assets/0.abc.css", "the emitted CSS holds 3 Svelte scoping classes but only 2 sources hold a <style>")]);
  assert.deepEqual(g2(utilities(""), ".svelte-Glow-1{color:red}"),
    [cross("build/_app/immutable/assets/0.abc.css", 'utility class "svelte-Glow-1" is in the emitted CSS but no owner writes it: no source and no source stylesheet holds it')]);
});

// Ported from the previous gate's toolbar ownership laws, generalised: a global stylesheet names only what its owner
// draws (classes and data marks written in markup), and a custom property has one writing owner (the theme's, when it writes it).
const toolbarCss = `${foundations}/toolbar/toolbar.css`;
const withToolbar = (css: string) => ({ ...tree(), ...foundation("toolbar", "Toolbar.svelte",
  '<header class="toolbar-row" data-toolbar-title></header>\n', ', parts: ["toolbar.css"]'), [toolbarCss]: css });
test("G: a global stylesheet naming a class or a data mark that only another owner draws", () => {
  for (const selector of [".toolbar-row", "[data-toolbar-title]", "[data-catalog-workspace] .toolbar-row button", ":is([data-toolbar-title], .x)"]) {
    const found = run(append(withToolbar(""), shared, `\n${selector} { padding-inline-start: 99px; }\n`));
    assert.ok(found.some(line => line.startsWith(`CROSS_OWNER_CSS ${shared} selector`) && line.includes("which only toolbar draws")), selector);
  }
  assert.ok(!run(append(withToolbar(".toolbar-row { gap: 1px; }\n"), shared, "")).some(line => line.includes(toolbarCss)), "the owner styles its own mark");
  assert.deepEqual(run(append(tree(), heading, "")).filter(line => line.includes("draws")), [], "a scoped <style> reaches only its own markup");
});
test("G: a custom property has one writing owner, in CSS, inline styles, style directives and setProperty", () => {
  const writes = withToolbar(":root { --toolbar-inset: 0; }\n");
  for (const [path, text] of [
    [shared, "\n.x { --toolbar-inset: 99px; }\n"],
    [`${foundations}/action/Action.svelte`, '<div style="--toolbar-inset:0"></div>\n'],
    [`${foundations}/action/Action.svelte`, '<div style:--toolbar-inset="0"></div>\n'],
    [`${foundations}/action/Action.svelte`, '<script lang="ts">\n  const set = (node: HTMLElement) => node.style.setProperty("--toolbar-inset", "0");\n</script>\n'],
  ] as const) {
    const found = run(append(writes, path, text));
    assert.ok(found.some(line => line.includes("writes --toolbar-inset") && line.includes("a custom property has one writing owner")), `${path}: ${text}`);
  }
  const themed = run(append(append(tree(), tokens, ":root { --face-size: 2rem; }\n"), wellCss, "[data-field-well] { --face-size: 3rem; }\n"));
  assert.deepEqual(themed.filter(line => line.includes("--face-size")), [cross(wellCss, "field-well writes --face-size, which mechanism theme also writes: a custom property has one writing owner")],
    "when the theme writes a token, only the other writers are reported");
});
