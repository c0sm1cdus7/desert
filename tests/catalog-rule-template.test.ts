// Rule T: the generated host adds nothing visual. The control is DESERT's own host files, read from disk at the paths
// the layout lists; each negative case mutates one of them and expects the named grammar check to fail.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { posix, resolve } from "node:path";
import test from "node:test";
import { createHash } from "node:crypto";
import { emptyStyle, kitAnnouncerStyle, ruleT } from "../src/authoring/catalog/gate/template-artifacts.ts";
import { DesertLayout, type CatalogLayout } from "../src/authoring/catalog/layout.ts";
import { codes, contextOf } from "./support/catalog-context.ts";
import { testLayout } from "./support/catalog-layout.ts";
import { realContext } from "./support/real-tree.ts";

const root = resolve(import.meta.dirname, ".."), listed = DesertLayout.fixed["build-host"] ?? [];
const at = (name: string) => listed.find(path => posix.basename(path) === name) ?? name;
const vite = at("vite.mjs"), config = at("config.mjs"), worker = at("worker.mjs"), image = at("bank-image.svg");
const index = "src/svelte/catalog/index.ts";
/** DESERT's host files as they are today, without the static asset (declared by slice 3), plus a catalog index. */
const tree = (): Record<string, string> => ({
  ...Object.fromEntries(listed.filter(path => path !== image).map(path => [path, readFileSync(resolve(root, path), "utf8")])),
  [index]: "export const AccessGate = 1;\nexport const PublicCatalogProduct = 1;\n",
});
const layout = (hostFiles: readonly string[] = listed, overrides: Partial<CatalogLayout> = {}) => testLayout({ roots: ["src/svelte", "src/build/svelte"],
  fixed: { "build-host": hostFiles, theme: DesertLayout.fixed.theme ?? [] }, ...overrides });
const run = (files: Record<string, string>, hostFiles?: readonly string[], overrides?: Partial<CatalogLayout>) =>
  codes(ruleT(contextOf(files, layout(hostFiles, overrides))));
const edit = (path: string, from: string, to: string) => {
  const files = tree(), text = files[path] ?? "";
  assert.ok(text.includes(from), `${path} holds ${from}`);
  return { ...files, [path]: text.replace(from, to) };
};
const artifact = (path: string, what: string) => `UNQUALIFIED_ARTIFACT ${path} ${what}`;

test("T control: DESERT's host files pass", () => {
  assert.deepEqual(run(tree()), []);
});

test("T: a static asset of the template is reported", () => {
  assert.deepEqual(run({ ...tree(), [image]: "<svg/>" }), [artifact(image, "a static asset of the template is not a declared asset of a foundation")]);
});

/** A foundation's declaration with `assets` as given: rule T qualifies a static asset only through such a field. */
const assetOwner = (id: string, assets: string) => ({
  [`src/svelte/catalog/foundations/${id}/${id}.catalog.ts`]: `import { defineFoundation } from "x";
import { C } from "./${id}.contract.ts";
export const F = defineFoundation({ id: "${id}", purpose: "x", owner: { entry: "Image.svelte" }, shape: "none",
  states: ["ready"], approval: "required", contract: C, assets: ${assets} } as const);\n`,
});

test("T: a static asset a foundation declares in its assets is qualified", () => {
  assert.deepEqual(run({ ...tree(), [image]: "<svg/>", ...assetOwner("image", '["bank-image.svg"]') }), []);
});

test("T: an asset declared by two foundations, or declared and absent from the static folder, is reported", () => {
  assert.deepEqual(run({ ...tree(), [image]: "<svg/>", ...assetOwner("image", '["bank-image.svg"]'), ...assetOwner("wallpaper", '["bank-image.svg"]') }),
    [artifact(image, "the static asset bank-image.svg is declared by more than one foundation: image, wallpaper")]);
  assert.deepEqual(run({ ...tree(), ...assetOwner("image", '["bank-image.svg"]') }),
    [artifact("src/svelte/catalog/foundations/image/image.catalog.ts", `image declares the asset bank-image.svg, which is not in ${posix.dirname(image)}/`)]);
});

test("T on the DESERT tree: every static asset of the template is declared by a foundation", () => {
  assert.deepEqual(codes(ruleT(realContext())), []);
});

test("T: host paths come from the layout: a host listed elsewhere is read there, and a missing entry is reported", () => {
  const moved = listed.map(path => path.replace("src/build/svelte/", "src/build/host/"));
  const files = Object.fromEntries(Object.entries(tree()).map(([path, text]) => [path.replace("src/build/svelte/", "src/build/host/"), text]));
  assert.deepEqual(run(files, moved.filter(path => path !== image.replace("src/build/svelte/", "src/build/host/"))), []);
  assert.deepEqual(run(tree(), listed.filter(path => path !== vite)), [artifact("vite.mjs", "the build-host layout lists no vite.mjs")]);
});

// vite.mjs
test("T vite: a transform hook on the desert-surface plugin is rejected", () => {
  assert.deepEqual(run(edit(vite, "load(id) {", "transform(code) { return code; },\n    load(id) {")),
    [artifact(vite, "the desert-surface plugin holds exactly name, resolveId, load; found name, resolveId, transform, load")]);
});

test("T vite: extra keys in the Vite config are rejected", () => {
  assert.deepEqual(run(edit(vite, "({ plugins: [", "({ css: { postcss: {} }, build: {}, plugins: [")),
    [artifact(vite, "the Vite config holds exactly plugins; found css, build, plugins")]);
});

test("T vite: a fourth plugin, or arguments to sveltekit(), are rejected", () => {
  assert.deepEqual(run(edit(vite, "tailwindcss(), sveltekit(),", "tailwindcss(), sveltekit(), tailwindcss(),")),
    [artifact(vite, "the Vite plugins are exactly desert-surface, tailwindcss(), sveltekit(); found desert-surface, tailwindcss(), sveltekit(), tailwindcss()")]);
  assert.deepEqual(run(edit(vite, "sveltekit()", "sveltekit({ x: 1 })")),
    [artifact(vite, "the Vite plugins are exactly desert-surface, tailwindcss(), sveltekit(); found desert-surface, tailwindcss(), sveltekit({ x: 1 })")]);
});

test("T vite: a load hook that returns anything but surface.mjs, or a resolveId for another id, is rejected", () => {
  assert.deepEqual(run(edit(vite, 'readFileSync(resolve("surface.mjs"), "utf8")', '"body { color: red }"')),
    [artifact(vite, "the desert-surface load returns only surface.mjs for its private id")]);
  assert.deepEqual(run(edit(vite, 'if (id === "virtual:desert/surface")', 'if (id.endsWith(".css"))')),
    [artifact(vite, "the desert-surface resolveId maps only virtual:desert/surface to its private id")]);
});

test("T vite: a new statement, or a config that is not defineConfig(() => ({ plugins })), is rejected", () => {
  assert.deepEqual(run(edit(vite, "export default", 'globalThis.x = 1;\nexport default')),
    [artifact(vite, "holds only its imports and one export default; found ExpressionStatement")]);
  assert.deepEqual(run(edit(vite, "defineConfig(() => ({", "defineConfig(async () => ({")),
    [artifact(vite, "exports defineConfig(() => ({ plugins }))")]);
});

// config.mjs
test("T config: extra keys at the top and in kit are rejected", () => {
  assert.deepEqual(run(edit(config, "  preprocess:", "  compilerOptions: {},\n  preprocess:")),
    [artifact(config, "the Svelte config holds exactly preprocess, kit; found compilerOptions, preprocess, kit")]);
  assert.deepEqual(run(edit(config, "    adapter:", "    inlineStyleThreshold: 1e9,\n    adapter:")),
    [artifact(config, "kit holds exactly adapter, alias, csp; found inlineStyleThreshold, adapter, alias, csp")]);
});

test("T config: preprocess, adapter and alias keep their fixed shape", () => {
  assert.deepEqual(run(edit(config, "preprocess: vitePreprocess()", "preprocess: [vitePreprocess()]")),
    [artifact(config, "preprocess is exactly vitePreprocess()")]);
  assert.deepEqual(run(edit(config, 'adapter({ out: "build" })', 'adapter({ out: "build", precompress: true })')),
    [artifact(config, 'the adapter is exactly adapter({ out: "build" })')]);
  assert.deepEqual(run(edit(config, "    alias: {", '    alias: {\n      "$theme": "/tmp/x.css",')),
    [artifact(config, "kit.alias holds exactly @desert, @desert-internal/bits-scroll-lock; found $theme, @desert, @desert-internal/bits-scroll-lock")]);
});

test("T config: CSP directives are a closed set, and a directive allows only its current sources", () => {
  assert.deepEqual(run(edit(config, '"object-src": ["none"]', '"style-src-elem": ["unsafe-inline"], "object-src": ["none"]')),
    [artifact(config, "CSP directive style-src-elem is not one of the host's directives")]);
  assert.deepEqual(run(edit(config, '"style-src": ["self"]', '"style-src": ["self", "unsafe-inline"]')),
    [artifact(config, "CSP directive style-src allows only self; found self, unsafe-inline")]);
  assert.deepEqual(run(edit(config, '"default-src": ["self"], ', "")), [artifact(config, "CSP directive default-src is missing")]);
});

test("T config N36: inline style attributes are refused; style-src-attr allows only the route announcer and the empty attribute, by hash", () => {
  const allowed = `"style-src-attr": ["unsafe-hashes", "${kitAnnouncerStyle}", "${emptyStyle}"]`;
  assert.deepEqual(run(edit(config, allowed, '"style-src-attr": ["unsafe-inline"]')),
    [artifact(config, `CSP directive style-src-attr allows only unsafe-hashes, ${kitAnnouncerStyle}, ${emptyStyle}; found unsafe-inline`)]);
  assert.deepEqual(run(edit(config, allowed, `"style-src-attr": ["unsafe-hashes", "${kitAnnouncerStyle}", "${emptyStyle}", "sha256-AAAA"]`)),
    [artifact(config, `CSP directive style-src-attr allows only unsafe-hashes, ${kitAnnouncerStyle}, ${emptyStyle}; found unsafe-hashes, ${kitAnnouncerStyle}, ${emptyStyle}, sha256-AAAA`)]);
  assert.deepEqual(run(edit(config, `${allowed},\n`, "")), [artifact(config, "CSP directive style-src-attr is missing")]);
});

test("T config: the empty-attribute hash is the hash of an empty style (it applies no declaration)", () => {
  assert.equal(emptyStyle, `sha256-${createHash("sha256").update("").digest("base64")}`);
});

test("T config: the allowed inline style is exactly the announcer style the installed SvelteKit writes into its root", () => {
  const root = readFileSync(resolve(import.meta.dirname, "../node_modules/@sveltejs/kit/src/core/sync/write_root.js"), "utf8");
  const style = /<div id="svelte-announcer"[^>]* style="([^"]+)"/.exec(root)?.[1];
  assert.ok(style, "the installed SvelteKit root still draws the route announcer with a style attribute");
  assert.equal(kitAnnouncerStyle, `sha256-${createHash("sha256").update(style).digest("base64")}`);
});

// worker.mjs
test("T worker: a new statement kind is rejected", () => {
  assert.deepEqual(run(edit(worker, "if (mode === \"build\")", "function extra() {}\nif (mode === \"build\")")),
    [artifact(worker, "holds only its imports, the root and mode constants, the mode guard and the build steps; found FunctionDeclaration")]);
});

test("T worker: a new spawned binary, or new arguments to a known one, are rejected", () => {
  assert.deepEqual(run(edit(worker, '"node_modules/vite/bin/vite.js"), "build"]', '"node_modules/tailwindcss/cli.js"), "build"]')),
    [artifact(worker, "spawns only svelte-kit sync, svelte-check and vite build; found node_modules/tailwindcss/cli.js build")]);
  assert.deepEqual(run(edit(worker, 'vite.js"), "build"]', 'vite.js"), "build", "--emptyOutDir"]')),
    [artifact(worker, "spawns only svelte-kit sync, svelte-check and vite build; found node_modules/vite/bin/vite.js build --emptyOutDir")]);
});

test("T worker: imports and bindings are fixed", () => {
  assert.deepEqual(run(edit(worker, 'import { execFileSync } from "node:child_process";', 'import { execFileSync, execSync } from "node:child_process";')),
    [artifact(worker, "imports from node:child_process only execFileSync; found execFileSync, execSync")]);
});

// +layout.svelte, +page.svelte, public-catalog-page.svelte: an exact statement grammar, one instance script
const layoutRoute = at("+layout.svelte"), pageRoute = at("+page.svelte"), publicPage = at("public-catalog-page.svelte");
const layoutShape = "the layout script holds exactly the theme import, the Snippet type import and let { children }: { children: Snippet } = $props()";
const pageShape = (composition: string) => `a page script holds exactly the ${composition} import from the catalog index and the surface module import`;

test("T layout: a dynamic import, an extra statement or a module script is rejected", () => {
  const mounted = run(edit(layoutRoute, "  let { children }", '  import("svelte").then(s => s.mount(null, { target: document.body }));\n  let { children }'));
  assert.deepEqual(mounted, [artifact(layoutRoute, `${layoutShape}; found ExpressionStatement`),
    artifact(layoutRoute, "the layout imports only the theme and the Snippet type; found @desert/svelte/theme.css, import(svelte), type svelte")]);
  assert.deepEqual(run(edit(layoutRoute, "  let { children }", "  const x = 1;\n  let { children }")), [artifact(layoutRoute, `${layoutShape}; found VariableStatement`)]);
  assert.deepEqual(run(edit(layoutRoute, "  let { children }: { children: Snippet } = $props();", "  let { children, x }: { children: Snippet; x: string } = $props();")),
    [artifact(layoutRoute, `${layoutShape}; found VariableStatement`), artifact(layoutRoute, `${layoutShape}; missing let { children }: { children: Snippet } = $props();`)]);
  assert.deepEqual(run(edit(layoutRoute, '<script lang="ts">', '<script module>\n  globalThis.x = 1;\n</script>\n<script lang="ts">')),
    [artifact(layoutRoute, 'holds one <script lang="ts"> and no module script')]);
});

test("T layout: the theme import is the layout's theme, written through its alias", () => {
  assert.deepEqual(run(edit(layoutRoute, '"@desert/svelte/theme.css"', '"@desert/svelte/other.css"')),
    [artifact(layoutRoute, `${layoutShape}; found ImportDeclaration`), artifact(layoutRoute, `${layoutShape}; missing import "@desert/svelte/theme.css";`),
      artifact(layoutRoute, "the layout imports only the theme and the Snippet type; found @desert/svelte/other.css, type svelte")]);
});

for (const [path, composition] of [[pageRoute, "AccessGate"], [publicPage, "PublicCatalogProduct"]] as const) {
  test(`T ${posix.basename(path)}: an extra statement, a dynamic import or a module script is rejected`, () => {
    assert.deepEqual(run(edit(path, "</script>", "  const x = 1;\n</script>")), [artifact(path, `${pageShape(composition)}; found VariableStatement`)]);
    assert.deepEqual(run(edit(path, "</script>", '  void import("svelte");\n</script>')),
      [artifact(path, `${pageShape(composition)}; found ExpressionStatement`),
        artifact(path, `a page imports only ${composition} from the catalog index and the surface module; found import(svelte)`)]);
    assert.deepEqual(run(edit(path, '<script lang="ts">', '<script module>\n  export const x = 1;\n</script>\n<script lang="ts">')),
      [artifact(path, 'holds one <script lang="ts"> and no module script')]);
  });
}

// bits-scroll-lock.ts: the resolver's statements and returned path are pinned
const bits = at("bits-scroll-lock.ts");
test("T bits-scroll-lock: the returned path, the statements and the signature of resolveBitsScrollLock are pinned", () => {
  const shape = "resolveBitsScrollLock returns only the bits-ui scroll-lock file under the installed package root, after its version check";
  assert.deepEqual(run(edit(bits, '"dist/bits/utilities/scroll-lock/scroll-lock.svelte"', '"../../src/svelte/catalog/foundations/lock-screen/LockScreen.svelte"')),
    [artifact(bits, `${shape}; found const file = join(root, "../../src/svelte/catalog/foundations/lock-screen/LockScreen.svelte");`)]);
  assert.deepEqual(run(edit(bits, "  return file;", '  return file;\n  globalThis.x = file;')), [artifact(bits, `${shape}; found globalThis.x = file;`)]);
  assert.deepEqual(run(edit(bits, "  return file;", '  globalThis.x = file;\n  return file;')),
    [artifact(bits, `${shape}; found globalThis.x = file;`), artifact(bits, `${shape}; found return file;`)]);
  assert.deepEqual(run(edit(bits, "  return file;", '  return file + "";')), [artifact(bits, `${shape}; found return file + "";`)]);
  assert.deepEqual(run(edit(bits, 'installed.name !== "bits-ui"', '(globalThis.x = installed.name) !== "bits-ui"')),
    [artifact(bits, `${shape}; found the version check calls or assigns`)]);
  assert.deepEqual(run(edit(bits, '(entry: string = require.resolve("bits-ui"))', '(entry: string = require.resolve("other"))')),
    [artifact(bits, 'resolveBitsScrollLock is exactly export function resolveBitsScrollLock(entry: string = require.resolve("bits-ui")): string')]);
  assert.deepEqual(run(edit(bits, "export function resolveBitsScrollLock", "export function resolveBitsScrollLock(): string { return \"\"; }\nexport function resolveBitsScrollLock")),
    [artifact(bits, "holds exactly one require and one resolveBitsScrollLock")]);
});

test("T: the theme import and the tree-root alias are read from the layout, not written in the rule", () => {
  const theme = { "build-host": listed, theme: ["src/svelte/other.css"] };
  assert.deepEqual(run(tree(), undefined, { fixed: theme }), [
    artifact(layoutRoute, `${layoutShape}; found ImportDeclaration`), artifact(layoutRoute, `${layoutShape}; missing import "@desert/svelte/other.css";`),
    artifact(layoutRoute, "the layout imports only the theme and the Snippet type; found @desert/svelte/theme.css, type svelte")]);
  assert.deepEqual(run(edit(layoutRoute, '"@desert/svelte/theme.css"', '"@desert/svelte/other.css"'), undefined, { fixed: theme }), []);
  const aliases = [["@desert/svelte/", "src/svelte/"], ["@root/", "src/"]] as const;
  assert.deepEqual(run(tree(), undefined, { aliases }),
    [artifact(config, "kit.alias holds exactly @root, @desert-internal/bits-scroll-lock; found @desert, @desert-internal/bits-scroll-lock"),
      artifact(config, 'alias @root is fileURLToPath(new URL("../../", import.meta.url))')]);
});
