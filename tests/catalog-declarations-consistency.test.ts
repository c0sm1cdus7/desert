// Rule B: declarations agree with each other and with the files they name.
import assert from "node:assert/strict";
import test from "node:test";
import { assertDeclarationsConsistent } from "../src/authoring/catalog/gate/declarations.ts";
import { readDeclarations } from "../src/authoring/catalog/read-declaration.ts";
import { testLayout } from "./support/catalog-layout.ts";

const layout = testLayout({ pieces: { foundation: ["src/svelte/catalog/foundations"],
  composition: ["src/svelte/catalog/compositions", "src/svelte/catalog/renderer"], mechanism: ["src/svelte/catalog/mechanisms"] } });
const foundations = "src/svelte/catalog/foundations", compositions = "src/svelte/catalog/compositions";
const at = (path: string, source: string) => readDeclarations(path, source).map(declaration => ({ path, declaration }));
const foundation = (id: string, extra = "") => at(`${foundations}/${id}/${id}.catalog.ts`, `import { C } from "./c.ts";
export const F = defineFoundation({ id: "${id}", purpose: "x", owner: { entry: "${id}.svelte"${extra} }, shape: "radius",
  states: ["empty"], approval: "required", contract: C } as const);`);
const composition = (id: string, uses: string, folder = compositions) => at(`${folder}/${id}/${id}.catalog.ts`, `import { C } from "./c.ts";
export const P = defineComposition({ id: "${id}", purpose: "x", owner: { entry: "${id}.svelte" }, uses: [${uses}],
  approval: "none", contract: C } as const);`);
const theme = at("src/svelte/catalog/mechanisms/theme/theme.mechanism.ts",
  'export const T = defineMechanism({ id: "theme", owner: "theme", files: ["tokens.css"] } as const);');
const files = (...ids: string[]) => new Set([`${foundations}/field/field.svelte`, `${foundations}/field/field.contract.ts`,
  `${compositions}/lock/lock.svelte`, `${compositions}/lock/lock.contract.ts`, "src/svelte/catalog/mechanisms/theme/tokens.css", ...ids]);
const valid = [...foundation("field"), ...composition("lock", '"field"'), ...theme];

test("consistent declarations pass", () => {
  assert.doesNotThrow(() => assertDeclarationsConsistent(valid, files(), layout));
});

test("inconsistent declarations name the declaration and the broken reference", () => {
  const broken: readonly [string, readonly ReturnType<typeof at>[number][], RegExp][] = [
    ["unknown used piece", [...foundation("field"), ...composition("lock", '"field", "slider"'), ...theme], /lock.*slider/],
    ["unknown mechanism", [...foundation("field", ', mechanisms: ["pane"]'), ...composition("lock", '"field"'), ...theme], /field.*pane/],
    ["missing theme", [...foundation("field"), ...composition("lock", '"field"')], /theme/],
    ["declaration outside its id folder", [...at(`${foundations}/well/field.catalog.ts`, `import { C } from "./c.ts";
export const F = defineFoundation({ id: "field", purpose: "x", owner: { entry: "field.svelte" }, shape: "radius",
  states: ["empty"], approval: "required", contract: C } as const);`), ...composition("lock", '"field"'), ...theme], /field.*foundations\/field\/field\.catalog\.ts/],
    ["composition under the foundations folder", [...foundation("field"), ...composition("lock", '"field"', foundations), ...theme], /lock/],
  ];
  for (const [label, declarations, expected] of broken) {
    assert.throws(() => assertDeclarationsConsistent(declarations, files(), layout),
      error => error instanceof Error && /^CATALOG_DECLARATION:/.test(error.message) && expected.test(error.message), label);
  }
});

test("two declarations with one id are refused", () => {
  const twin = at(`${compositions}/field/field.catalog.ts`, `import { C } from "./c.ts";
export const P = defineComposition({ id: "field", purpose: "x", owner: { entry: "field.svelte" }, uses: [], approval: "none", contract: C } as const);`);
  assert.throws(() => assertDeclarationsConsistent([...valid, ...twin], files(), layout), /CATALOG_DECLARATION: .*field.*twice/);
});

test("a declared entry, part or contract that does not exist is refused", () => {
  const missingPart = [...foundation("field", ', parts: ["field.css"]'), ...composition("lock", '"field"'), ...theme];
  assert.throws(() => assertDeclarationsConsistent(missingPart, files(), layout), /CATALOG_DECLARATION: .*field\.css/);
  const withoutContract = new Set([...files()].filter(path => !path.endsWith("field.contract.ts")));
  assert.throws(() => assertDeclarationsConsistent(valid, withoutContract, layout), /CATALOG_DECLARATION: .*field\.contract\.ts/);
});

// Ported from the previous registry's "incomplete semantic bank" check: the bank mapping is one fact per declaration
// (`renders`), and once a resolved-node dispatcher exists, every resolved node kind is rendered by exactly one piece.
test("renders: every resolved node kind by exactly one piece, nothing outside the grammar", async () => {
  const { ResolvedNodes } = await import("../src/interaction/catalog.ts");
  const kinds = ResolvedNodes.entries.map(entry => entry.id), [first = "", second = ""] = kinds;
  const dispatcher = at("src/svelte/catalog/renderer/node-renderer/node-renderer.catalog.ts", `import { C } from "./c.ts";
export const N = defineComposition({ id: "node-renderer", purpose: "x", owner: { entry: "node-renderer.svelte" }, uses: [], dispatch: "resolved-node",
  approval: "none", contract: C } as const);`);
  const rendering = (renders: readonly string[]) => [...foundation("field"), ...at(`${compositions}/lock/lock.catalog.ts`, `import { C } from "./c.ts";
export const P = defineComposition({ id: "lock", purpose: "x", owner: { entry: "lock.svelte" }, uses: ["field"],${renders.length ? ` renders: ${JSON.stringify(renders)},` : ""}
  approval: "none", contract: C } as const);`), ...theme, ...dispatcher];
  const present = files("src/svelte/catalog/renderer/node-renderer/node-renderer.svelte", "src/svelte/catalog/renderer/node-renderer/node-renderer.contract.ts");
  assert.doesNotThrow(() => assertDeclarationsConsistent(rendering(kinds), present, layout));
  assert.throws(() => assertDeclarationsConsistent(rendering(kinds.slice(1)), present, layout), new RegExp(`CATALOG_DECLARATION: the resolved node kinds ${first.replace(".", "\\.")} are rendered by no piece`));
  assert.throws(() => assertDeclarationsConsistent(rendering([...kinds, "outside.visual"]), present, layout), /lock renders outside\.visual, which is not a resolved node kind/);
  const twice = [...rendering(kinds.slice(1)), ...at(`${compositions}/other/other.catalog.ts`, `import { C } from "./c.ts";
export const O = defineComposition({ id: "other", purpose: "x", owner: { entry: "other.svelte" }, uses: [], renders: [${JSON.stringify(first)}, ${JSON.stringify(second)}],
  approval: "none", contract: C } as const);`)];
  assert.throws(() => assertDeclarationsConsistent(twice, new Set([...present, `${compositions}/other/other.svelte`, `${compositions}/other/other.contract.ts`]), layout),
    new RegExp(`${second.replace(".", "\\.")} is rendered by lock and other`));
  assert.doesNotThrow(() => assertDeclarationsConsistent(rendering([]).filter(item => item.declaration.id !== "node-renderer"), files(), layout),
    "a tree without a resolved-node dispatcher needs no renderers");
});
