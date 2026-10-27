// Rule P: deleting a gate module, the theme, the ledger or the generated index cannot switch the gate off,
// and a gate folder holds only the modules the layout lists, so the list cannot fall behind the code.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertGateSources } from "../src/authoring/catalog/gate/sources.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { testLayout } from "./support/catalog-layout.ts";

const layout = testLayout();
const present = ["src/authoring/catalog/gate/run.ts", "src/svelte/theme.css", "src/svelte/catalog/approvals.json", "src/svelte/catalog/index.ts"];

async function withFiles(paths: readonly string[], check: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "desert-gate-sources-"));
  try {
    for (const path of paths) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), ""); }
    await check(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test("a complete gate passes", () => withFiles(present, root => assertGateSources(root, layout, "gate")));

for (const missing of present) test(`a missing ${missing} is named`, () => withFiles(present.filter(path => path !== missing), async root => {
  await assert.rejects(assertGateSources(root, layout, "gate"), new RegExp(`CATALOG_GATE_SOURCES: .*${missing.replaceAll(".", "\\.")}`));
}));

test("a gate module the layout does not list is refused", () => withFiles([...present, "src/authoring/catalog/gate/extra.ts"], async root => {
  await assert.rejects(assertGateSources(root, layout, "gate"), /CATALOG_GATE_SOURCES: .*gate\/extra\.ts is not listed/);
}));

test("the DESERT tree has every gate source and lists every gate module", async () => {
  await assertGateSources(fileURLToPath(new URL("..", import.meta.url)), DesertLayout, "gate");
});

// One fact, one place: the readers every rule shares are defined once and imported, so two copies cannot drift apart.
const sharedReaders = ["isNode", "field", "text", "list", "nodes", "patternNames", "lineOf", "inTypePosition", "globalObjects", "constantText"];
test("each shared syntax reader of the gate is defined in exactly one module", async () => {
  const folder = fileURLToPath(new URL("../src/authoring/catalog/gate/", import.meta.url)), definitions = new Map<string, string[]>();
  for (const file of (await readdir(folder)).filter(name => name.endsWith(".ts")).sort()) {
    for (const match of (await readFile(join(folder, file), "utf8")).matchAll(/^(?:export )?(?:const|function) ([A-Za-z_$][\w$]*)\b/gm)) {
      const name = match[1] ?? "";
      if (sharedReaders.includes(name)) definitions.set(name, [...definitions.get(name) ?? [], file]);
    }
  }
  assert.deepEqual(sharedReaders.filter(name => (definitions.get(name) ?? []).length !== 1).map(name => `${name}: ${(definitions.get(name) ?? []).join(", ")}`), []);
});
