// Rule O: page code in the visual roots runs and renders only what the gate can read (OPAQUE_SOURCE). Ported from the
// previous gate's sealed-adapter and closed-component tests: evaluators, require, computed and template import(), and
// {@html} outside a composition (rule D reports it there as drawing).
import assert from "node:assert/strict";
import test from "node:test";
import { ruleO } from "../src/authoring/catalog/gate/opaque-source.ts";
import { codes, composition, contextOf, foundation } from "./support/catalog-context.ts";
import { added, mutated } from "./support/real-tree.ts";

const runO = (files: Record<string, string>) => codes(ruleO(contextOf(files)));
const card = "src/svelte/catalog/foundations/card/Card.svelte";
const inCard = (markup: string) => runO(foundation("card", "Card.svelte", markup));

test("O control: the real tree, literal imports, local bindings named like evaluators and Reflect.ownKeys pass", () => {
  assert.deepEqual(added(ruleO, {}), []);
  assert.deepEqual(inCard('<script lang="ts">\n  const load = () => import("./data.ts");\n  const eval_ = (Function: () => void) => Function();\n'
    + '  const keys = (value: object) => Reflect.ownKeys(value);\n  const schema = { Function: 1 };\n  setTimeout(() => {}, 0);\n</script>\n<p></p>\n'), []);
});

test("O: evaluators, reflection and string timers are opaque", () => {
  for (const [script, what] of [
    ['eval("document.write(1)")', "eval"], ['new Function("document.write(1)")()', "Function"], ["const Execute = Function;", "Function"],
    ['(() => {}).constructor("x")()', "a function's constructor"], ['(() => {})["constructor"]', "a function's constructor"],
    ["({}).__proto__", "a function's __proto__"], ['Reflect.get(() => {}, "constructor")', "Reflect"],
    ['setTimeout("document.write(1)", 0)', "setTimeout with a string of code"], ['globalThis.eval("x")', "globalThis.eval"],
    ['window["Function"]("x")', "window.Function"],
  ] as const) assert.ok(inCard(`<script lang="ts">\n  ${script};\n</script>\n<p></p>\n`).some(line => line.includes(`${what}: an evaluator`)), script);
});

test("O: require, a computed import() and any import() in a template expression are opaque", () => {
  assert.deepEqual(inCard('<script lang="ts">\n  const a = require("./x.ts");\n  const b = (name: string) => import(name);\n</script>\n'
    + '<button onclick={() => import("./Anything.svelte")}></button>\n'), [
    `OPAQUE_SOURCE ${card} require(): only static imports`, `OPAQUE_SOURCE ${card} import() of a computed module`,
    `OPAQUE_SOURCE ${card} import() in a template expression`]);
});

test("O: a renderer script runs no import() at all, a literal module included", () => {
  const frameBody = "src/svelte/catalog/renderer/frame-body/FrameBody.svelte";
  for (const script of ['const load = () => import("./Anything.ts");', 'const module = await import("../../index.ts");']) {
    assert.deepEqual(added(ruleO, mutated(frameBody, '<script lang="ts">\n', `<script lang="ts">\n  ${script}\n`)),
      [`OPAQUE_SOURCE: ${frameBody}:2: import() in a renderer: a renderer imports its pieces statically`], script);
  }
  assert.deepEqual(added(ruleO, mutated(frameBody, '<script lang="ts">\n', '<script lang="ts">\n  type Loaded = typeof import("./Anything.ts");\n')), []);
});

test("O: {@html} in a foundation, a vendor family or a renderer part; a composition's is rule D's", () => {
  assert.deepEqual(inCard("{@html markup}\n"), [`OPAQUE_SOURCE ${card} {@html} renders markup the gate cannot read`]);
  assert.deepEqual(runO(composition("page", "Page.svelte", [], "{@html markup}\n")), []);
  for (const path of ["src/svelte/catalog/foundations/image/Image.svelte", "src/svelte/catalog/foundations/media-player/MediaPlayer.svelte",
    "src/svelte/vendor/components/ui/slider/slider.svelte"]) {
    assert.ok(added(ruleO, mutated(path, "</script>", "</script>\n{@html foreign}")).some(line => line.includes("{@html}")), path);
  }
});

test("O: build-host modules run in Node at build time and are rule T's", () => {
  assert.deepEqual(added(ruleO, mutated("src/build/svelte/project.ts", 'import { join } from "node:path";', 'import { join } from "node:path";\nconst late = (name: string) => import(name);')), []);
});
