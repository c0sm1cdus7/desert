import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertCanonicalToolbarOwnership } from "../src/authoring/visual-boundary/toolbar.ts";
import { previousGateViolations, readVisualBoundarySources, runWithVisualBoundaries } from "../src/authoring/visual-boundary/source.ts";

const consumer = "src/svelte/explorer/Consumer.svelte";
const sources = await readVisualBoundarySources(new URL("..", import.meta.url).pathname);
const check = (css: string, path = consumer) => assertCanonicalToolbarOwnership([
  ...sources,
  { path, source: path.endsWith(".css") ? css : `<style>${css}</style>` },
]);

for (const selector of [
  "[data-catalog-workspace] h2",
  "[data-catalog-workspace] span",
  "[data-catalog-workspace] div",
  "[data-catalog-workspace] button",
  "[data-catalog-workspace] :is(h2, p)",
  "[data-catalog-workspace] :where(h2)",
  "[data-catalog-workspace] *",
  "[data-catalog-workspace] [title]",
  "[data-catalog-workspace] :not(.never)",
  '[data-catalog-workspace] [class^="toolbar"]',
  "[data-catalog-workspace] :where(*)",
]) test(`toolbar geometry rejects an indirect global subject: ${selector}`, () => {
  assert.throws(() => check(`:global(${selector}) { padding-inline-start:99px; }`), /TOOLBAR_OWNERSHIP/);
  assert.throws(() => check(`${selector} { padding-inline-start:99px; }`, "src/svelte/explorer/consumer.css"), /TOOLBAR_OWNERSHIP/);
});

test("nested global selectors cannot conceal the foreign toolbar subject", () => {
  for (const css of [
    ":global { [data-catalog-workspace] { & h2 { padding-inline-start:99px; } } }",
    ":global([data-catalog-workspace]) { & :global(h2) { padding-inline-start:99px; } }",
    ":is(:global([data-catalog-workspace] h2)) { padding-inline-start:99px; }",
  ]) assert.throws(() => check(css), /TOOLBAR_OWNERSHIP/);
});

test("the theme bootstrap cannot author generic toolbar geometry", () => {
  for (const selector of ["h2", ":not(.never)", ":where(*)"])
    assert.throws(() => assertCanonicalToolbarOwnership(sources.map(source =>
      source.path === "src/svelte/theme.css" ? { ...source,
        source: `${source.source}\n${selector} { padding-inline-start:99px; }` } : source)), /TOOLBAR_OWNERSHIP/);
});

test("foreign heading spacing and type cannot bypass toolbar geometry ownership", () => {
  for (const property of ["margin-left", "margin-inline-start", "font-size", "font-weight", "line-height", "letter-spacing", "text-indent",
    "inline-size", "min-inline-size", "max-block-size", "translate", "transform", "position", "inset-inline-start", "display", "order", "white-space", "text-align"])
    assert.throws(() => check(`:global([data-catalog-workspace] h2) { ${property}:99px; }`), /TOOLBAR_OWNERSHIP/);
});

test("the complete AST guard normalizes CSS declaration spellings", () => {
  for (const declaration of ["PADDING:99px", "Padding-Inline-Start:99px", "\\70 adding:99px", "padding/**/:99px", "padding-inline-\\73 tart:99px"])
    assert.throws(() => check(`:global([data-catalog-workspace] h2) { ${declaration}; }`), /TOOLBAR_OWNERSHIP/);
});

test("foundation responsibility does not allow arbitrary title geometry", () => {
  for (const [path, css] of [
    ["src/svelte/catalog/mechanisms/pane-material/pane-material.css", "h2 {opacity:0}"],
    ["src/svelte/catalog/mechanisms/control-feedback/control-feedback.css", "@utility tm-control { h2 {transform:scale(2)} }"],
    ["src/svelte/catalog/mechanisms/typography/typography.css", "h2 {padding:99px}"],
  ]) assert.throws(() => assertCanonicalToolbarOwnership(sources.map(source => source.path === path
    ? { ...source, source: `${source.source}\n${css}` } : source)), /TOOLBAR_OWNERSHIP/);
});

test("measured placement has one profile reference and cannot be overridden by a consumer", () => {
  for (const property of ["--place-leading-inset", "--sidebar-width", "--catalog-sidebar-width"])
    assert.throws(() => check(`:global([data-catalog-workspace]) { ${property}:99px; }`), /TOOLBAR_OWNERSHIP/);
  for (const replacement of ["--sidebar-width:99px", "--sidebar-width:var(--catalog-sidebar-width);padding:99px"])
    assert.throws(() => assertCanonicalToolbarOwnership(sources.map(source => source.path === "src/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte"
      ? { ...source, source: source.source.replace("--sidebar-width:var(--catalog-sidebar-width)", replacement) } : source)), /TOOLBAR_OWNERSHIP/);
});

test("an intermediate reading variable inherits its canonical writer transitively", () => {
  const aliased = sources.map(source => source.path === "src/svelte/catalog/mechanisms/surface-reading/surface-reading.css"
    ? { ...source, source: source.source.replace("--place-surface-inset:26px;",
      "--place-surface-inset:var(--reading-intermediate); --reading-intermediate:26px;") } : source);
  assert.doesNotThrow(() => assertCanonicalToolbarOwnership(aliased));
  assert.throws(() => assertCanonicalToolbarOwnership([...aliased, { path: consumer,
    source: "<style>:global([data-catalog-workspace]) { --reading-intermediate:99px; }</style>" }]), /TOOLBAR_OWNERSHIP/);
  assert.throws(() => assertCanonicalToolbarOwnership([...aliased, { path: consumer,
    source: '<div style={"--reading-intermediate:99px"}></div>' }]), /TOOLBAR_OWNERSHIP/);
});

for (const property of ["--place-content-inset", "--place-surface-inset", "--chrome-inset", "--text-body--line-height"])
  test(`toolbar geometry rejects an inherited upstream input: ${property}`, () => {
    assert.throws(() => check(`:global([data-catalog-workspace]) { ${property}:99px; }`), /TOOLBAR_OWNERSHIP/);
    assert.throws(() => assertCanonicalToolbarOwnership([...sources, { path: consumer,
      source: `<div style="${property}:99px"></div>` }]), /TOOLBAR_OWNERSHIP/);
  });

test("a local scoped heading and unrelated owned content do not gain or lose toolbar authority", () => {
  assert.doesNotThrow(() => assertCanonicalToolbarOwnership([...sources, { path: consumer,
    source: "<h2>Local content</h2><style>h2 { padding-inline-start:12px; }</style>" }]));
  assert.doesNotThrow(() => check(":global([data-private-example-content]) { padding-inline-start:12px; }"));
});

test("the real worker boundary rejects a catalog consumer's generic heading override", async () => {
  const root = await mkdtemp(join(tmpdir(), "desert-toolbar-indirect-"));
  let calls = 0;
  const worker = async () => { calls++; };
  try {
    await cp(new URL("../src", import.meta.url), join(root, "src"), { recursive: true });
    // Strict build (Q1): the real tree still carries catalog violations, so the worker never runs; the previous gate alone passes.
    assert.deepEqual(await previousGateViolations(root), []);
    const path = join(root, "src/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte");
    const original = await readFile(path, "utf8");
    const candidate = original.replace("</style>",
      ":global([data-catalog-workspace] h2) { padding-inline-start:99px; }\n</style>");
    assert.notEqual(candidate, original);
    await writeFile(path, candidate);
    await assert.rejects(runWithVisualBoundaries(root, worker), /TOOLBAR_OWNERSHIP/);
    assert.equal(calls, 0, "the changed consumer must fail before the build worker");
  } finally { await rm(root, { recursive: true }); }
});
