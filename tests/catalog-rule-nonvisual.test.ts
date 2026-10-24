// Rule N: the interpreter and every module outside the visual roots that the page reaches stay nonvisual
// (NONVISUAL_DEPENDENCY). Ported from the previous gate's adapter-dependency-graph, adapter-dependency-adversarial and
// nonvisual-interpreter-boundary tests: each case mutates a copy of the real tree and must add a violation.
import assert from "node:assert/strict";
import test from "node:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { contentViolations, readCatalogTree } from "../src/authoring/catalog/gate/run.ts";
import { formatViolation } from "../src/authoring/catalog/gate/violation.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { desertRoot } from "./support/real-tree.ts";

const adapter = "src/svelte/catalog/renderer/view-item/ViewItem.svelte", fixture = "src/web/client/graph-fixture.ts";

async function ruleN(root: string) {
  const { violations, context } = await contentViolations(root, await readCatalogTree(root, DesertLayout), { layout: DesertLayout, rules: ["N"] });
  return { found: violations.map(formatViolation), checked: context.nonvisual.files.map(file => file.path) };
}
const baseline = await ruleN(desertRoot);

/** What rule N reports on a copy of the tree after `change`, beyond the real tree's findings. */
async function addedBy(change: (root: string) => void): Promise<string[]> {
  const root = mkdtempSync(join(tmpdir(), "desert-rule-n-"));
  try {
    cpSync(join(desertRoot, "src"), join(root, "src"), { recursive: true });
    change(root);
    const { found } = await ruleN(root);
    return found.filter(line => !baseline.found.includes(line));
  } finally { rmSync(root, { recursive: true, force: true }); }
}
/** A real renderer imports `observe` from a helper outside the visual roots, whose source is `source`. */
const throughAdapter = (source: string, extra: (root: string) => void = () => {}) => (root: string) => {
  const path = join(root, adapter), original = readFileSync(path, "utf8");
  assert.ok(original.includes('<script lang="ts">'));
  writeFileSync(path, original.replace('<script lang="ts">', `<script lang="ts">\n  import { observe } from "${relative(dirname(adapter), fixture)}";\n  observe();`));
  writeFileSync(join(root, fixture), source);
  extra(root);
};

test("N control: the real tree is nonvisual, and every interpreter file is read, dormant ones included", async () => {
  assert.deepEqual(baseline.found, []);
  const interpreter = readdirSync(join(desertRoot, "src/web/client"), { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile()).map(entry => relative(desertRoot, join(entry.parentPath, entry.name)));
  assert.ok(interpreter.length > 20);
  for (const path of interpreter) assert.ok(baseline.checked.includes(path), `interpreter omitted: ${path}`);
});

test("N: visual authority hidden behind a renderer's TypeScript dependency", async () => {
  for (const source of [
    'import "../../svelte/theme.css"; export const observe = () => {};',
    'export { default as observe } from "../../svelte/catalog/foundations/action/Action.svelte";',
    'export const observe = () => { document.body.textContent = "Injected"; };',
    'export const observe = () => import("../../svelte/theme.css?inline");',
    'export const observe = () => { const host = globalThis; host["document"].write("Injected"); };',
    'import { mount } from "svelte"; export const observe = (component, target) => mount(component, { target });',
    'import * as framework from "svelte"; export const observe = framework.mount;',
    'export { mount as observe } from "svelte";',
    'export const observe = () => setTimeout("document.write(1)", 0);',
    'export const observe = (target: Element) => target.insertAdjacentText("beforeend", "Injected");',
  ]) assert.ok((await addedBy(throughAdapter(source))).some(line => line.startsWith("NONVISUAL_DEPENDENCY: src/web/client/graph-fixture.ts")), source);
});

const constructions = { property: "(() => {}).constructor", element: '(() => {})["constructor"]', alias: "(() => {})[key]", reflect: 'Reflect.get(() => {}, "constructor")' };
for (const [form, expression] of Object.entries(constructions)) test(`N: code obtained through a function's constructor: ${form}`, async () => {
  const source = `const key = "constructor"; export const observe = () => (${expression})("document.body.textContent = 'Injected'")();`;
  // Independent witness: ordinary JS reaches drawing authority without naming Function, eval or globalThis.
  const sandbox = { document: { body: { textContent: "Original" } } };
  runInNewContext(`${ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText.replace("export ", "")}\nobserve();`, sandbox);
  assert.equal(sandbox.document.body.textContent, "Injected");
  assert.ok((await addedBy(throughAdapter(source))).some(line => line.includes("opaque execution")), form);
});

test("N: barrels do not launder visual authority, and missing or opaque edges fail closed", async () => {
  const second = (root: string) => writeFileSync(join(root, "src/web/client/graph-second.ts"), 'import "../../svelte/theme.css"; export const observe = () => {};');
  for (const source of ['export { observe } from "./graph-second.ts";', 'export { observe } from "./missing-graph-dependency.ts";',
    "export const observe = () => import(location.hash.slice(1));", 'import { observe } from "unregistered-drawing-package"; export { observe };']) {
    assert.notDeepEqual(await addedBy(throughAdapter(source, second)), [], source);
  }
});

test("N control: nonvisual helper chains and type-only visual references stay legal", async () => {
  assert.deepEqual(await addedBy(throughAdapter('export { observe } from "./graph-second.ts";', root => writeFileSync(join(root, "src/web/client/graph-second.ts"),
    'import type Action from "../../svelte/catalog/foundations/action/Action.svelte";\nlet target: HTMLElement | null = null;\n'
    + 'declare const ambient: Document;\nexport const observe = (document: { title: string }) => ({ title: document.title, target, value: 1 });'))), []);
});

test("N: the browser session's capability cannot become arbitrary host access", async () => {
  const session = DesertLayout.nonvisual.browserSession;
  for (const extension of ['window.document.write("Injected");', "const leaked = window; leaked.document.write(\"Injected\");",
    'window.addEventListener("resize", () => {});', 'location.hash = "#changed";', 'history.pushState(null, "", "/");',
    'window.addEventListener("beforeunload", event => { (event.currentTarget as Window).document.body.hidden = true; });',
    'window.addEventListener("beforeunload", event => { const host = event.currentTarget as Window; host.document.body.hidden = true; });',
    'window.addEventListener("beforeunload", ({ currentTarget }) => { (currentTarget as Window).document.body.hidden = true; });',
    'const hide = (host: Window) => { host.document.body.hidden = true; }; window.addEventListener("beforeunload", event => hide(event.currentTarget as Window));',
    'const protect = (event: BeforeUnloadEvent) => event.preventDefault(); function register(protect: (event: BeforeUnloadEvent) => void) { window.addEventListener("beforeunload", protect); } register(event => { (event.currentTarget as Window).document.body.hidden = true; });',
  ]) assert.ok((await addedBy(root => writeFileSync(join(root, session), `${readFileSync(join(root, session), "utf8")}\n${extension}`)))
    .some(line => line.startsWith(`NONVISUAL_DEPENDENCY: ${session}`)), extension);
});

test("N: dormant and nested interpreter helpers, and their dependency chains, cannot draw", async () => {
  for (const path of ["dormant.ts", "nested/dormant.ts", "dormant.js"]) assert.ok((await addedBy(root => {
    mkdirSync(dirname(join(root, "src/web/client", path)), { recursive: true });
    writeFileSync(join(root, "src/web/client", path), 'export const observe = () => { document.body.textContent = "Injected"; };');
  })).some(line => line.includes(`src/web/client/${path}`) && line.includes("visual runtime global: document")), path);
  assert.ok((await addedBy(root => {
    writeFileSync(join(root, "src/web/client/dormant.ts"), 'export { observe } from "../../dormant-helper.ts";');
    writeFileSync(join(root, "src/dormant-helper.ts"), "export const observe = () => document.body.hidden = true;");
  })).some(line => line.startsWith("NONVISUAL_DEPENDENCY: src/dormant-helper.ts")));
});

test("N: a catalog owner importing an interpreter helper does not grant the helper visual authority", async () => {
  assert.ok((await addedBy(root => {
    const owner = join(root, "src/svelte/catalog/compositions/view-product-content/ViewProductContent.svelte");
    writeFileSync(owner, readFileSync(owner, "utf8").replace('<script lang="ts">', '<script lang="ts">\n  import { observe } from "../../../../web/client/owner-helper.ts"; observe();'));
    writeFileSync(join(root, "src/web/client/owner-helper.ts"), "export const observe = () => { document.body.hidden = true; };");
  })).some(line => line.startsWith("NONVISUAL_DEPENDENCY: src/web/client/owner-helper.ts")));
});

test("N: unrecognized interpreter source formats and symlinked files or directories fail closed", async () => {
  assert.ok((await addedBy(root => writeFileSync(join(root, "src/web/client/dormant.tsx"), "export const view = <div>Injected</div>;")))
    .some(line => line.includes("unregistered interpreter source")));
  for (const directory of [false, true]) assert.ok((await addedBy(root => symlinkSync(join(desertRoot, directory ? "src/web/client" : "src/web/client/model.ts"),
    join(root, "src/web/client", directory ? "linked" : "linked.ts")))).some(line => line.includes("symlinked interpreter source")), String(directory));
});
