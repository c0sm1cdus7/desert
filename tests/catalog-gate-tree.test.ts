// The gate-from-base CI job judges the PR tree with `--tree`: the rules read it as data and every module loads from the
// gate's own checkout. A judged tree whose domain module throws on import must still be judged, and judged the same.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const checkout = resolve(import.meta.dirname, "..");
const gate = (...args: string[]) => spawnSync(process.execPath, [join(checkout, "scripts/catalog-gate.ts"), ...args], { cwd: checkout, encoding: "utf8" });

test("--tree judges another tree as data and never imports its modules", () => {
  const judged = mkdtempSync(join(tmpdir(), "desert-judged-"));
  try {
    cpSync(checkout, judged, { recursive: true, filter: source => !/^(node_modules|\.git|\.claude)(\/|$)/.test(relative(checkout, source)) });
    appendFileSync(join(judged, "src/interaction/extended-nodes.ts"), '\nthrow new Error("JUDGED_TREE_CODE_RAN");\n');
    const result = gate("--tree", judged, "--rules", "A,B,C,L,N");
    assert.doesNotMatch(result.stdout + result.stderr, /JUDGED_TREE_CODE_RAN/);
    assert.match(result.stdout, /Catalog gate rules P,A,B,C,L,N passed/);
    appendFileSync(join(judged, "src/interaction/extended-nodes.ts"), "\nexport const leak = () => document.title;\n");
    assert.match(gate("--tree", judged, "--rules", "A,B,C,L,N").stderr, /NONVISUAL_DEPENDENCY: src\/interaction\/extended-nodes\.ts/);
  } finally { rmSync(judged, { recursive: true, force: true }); }
});

test("--tree judges a tree that adds or removes gate modules: their list is that tree's own gate job's business", () => {
  const judged = mkdtempSync(join(tmpdir(), "desert-judged-"));
  try {
    cpSync(checkout, judged, { recursive: true, filter: source => !/^(node_modules|\.git|\.claude)(\/|$)/.test(relative(checkout, source)) });
    writeFileSync(join(judged, "src/authoring/catalog/gate/zz-new-rule.ts"), "export const rule = 1;\n");
    rmSync(join(judged, "src/authoring/catalog/gate/opaque-source.ts"));
    assert.match(gate("--tree", judged, "--rules", "A,B,C,L").stdout, /Catalog gate rules P,A,B,C,L passed/);
    rmSync(join(judged, "src/svelte/catalog/approvals.json"));
    assert.match(gate("--tree", judged, "--rules", "A").stderr, /CATALOG_GATE_SOURCES: missing src\/svelte\/catalog\/approvals\.json/);
  } finally { rmSync(judged, { recursive: true, force: true }); }
});

test("--tree takes a directory and judges with --rules only", () => {
  assert.match(gate("--tree").stderr, /CATALOG_GATE_USAGE/);
  assert.match(gate("--tree", checkout).stderr, /CATALOG_GATE_USAGE/);
});
