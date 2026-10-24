// Rule T: the generated host adds nothing visual. The control is DESERT's own host files, read from disk at the paths
// the layout lists; each negative case mutates one of them and expects the named grammar check to fail.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { posix, resolve } from "node:path";
import test from "node:test";
import { ruleT } from "../src/authoring/catalog/gate/template-artifacts.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { codes, contextOf } from "./support/catalog-context.ts";
import { testLayout } from "./support/catalog-layout.ts";

const root = resolve(import.meta.dirname, ".."), listed = DesertLayout.fixed["build-host"] ?? [];
const at = (name: string) => listed.find(path => posix.basename(path) === name) ?? name;
const vite = at("vite.mjs"), config = at("config.mjs"), worker = at("worker.mjs"), image = at("bank-image.svg");
const index = "src/svelte/catalog/index.ts";
/** DESERT's host files as they are today, without the static asset (declared by slice 3), plus a catalog index. */
const tree = (): Record<string, string> => ({
  ...Object.fromEntries(listed.filter(path => path !== image).map(path => [path, readFileSync(resolve(root, path), "utf8")])),
  [index]: "export const AccessGate = 1;\nexport const PublicCatalogProduct = 1;\n",
});
const layout = (hostFiles: readonly string[] = listed) => testLayout({ roots: ["src/svelte", "src/build/svelte"], fixed: { "build-host": hostFiles } });
const run = (files: Record<string, string>, hostFiles?: readonly string[]) => codes(ruleT(contextOf(files, layout(hostFiles))));
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

test("T config: style-src-attr 'unsafe-inline' is the documented N36 exception until slice 4; dropping it is legal", () => {
  assert.deepEqual(run(edit(config, '      "style-src-attr": ["unsafe-inline"],\n', "")), []);
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
