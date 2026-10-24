// Runs the Visual Catalog gate on this tree. Without arguments it calls exactly what the build calls
// (runWithCatalogGate: P, A–L, then every content rule). With --rules A,B,C,L,D,... it runs only those rules.
// Structural rules stop at the first error; content rules report every violation (scripts/catalog-violations.ts groups them).
// With --tree <dir> the rules judge that tree as data while every gate module still loads from this checkout: the
// gate-from-base CI job judges the PR's tree with the base gate, and no PR module is ever imported.
import { resolve } from "node:path";
import { assertGateSources } from "../src/authoring/catalog/gate/sources.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";

const checkout = resolve(import.meta.dirname, "..");
const treeFlag = process.argv.indexOf("--tree"), judged = treeFlag >= 0 ? process.argv[treeFlag + 1] : undefined;
if (treeFlag >= 0 && (!judged || !process.argv.includes("--rules"))) throw new Error("CATALOG_GATE_USAGE: --tree <dir> judges that tree with --rules");
const root = judged ? resolve(judged) : checkout;
if (process.argv.includes("--check-project")) {
  // svelte-check through the test-only evidence project, which runs only under node:test.
  const { spawnSync } = await import("node:child_process");
  const run = spawnSync(process.execPath, ["--test", resolve(checkout, "tests/tools/check-project.test.ts")], { stdio: "inherit" });
  process.exit(run.status ?? 1);
}
if (!process.argv.includes("--rules")) {
  const { runWithCatalogGate } = await import("../src/authoring/catalog/gate/build-gate.ts");
  await runWithCatalogGate(root, async () => undefined);
  console.log("Catalog gate passed: the same gate the build runs.");
  process.exit(0);
}
await assertGateSources(root, DesertLayout, judged ? "data" : "gate");
const { runCatalogGate, runContentRules } = await import("../src/authoring/catalog/gate/run.ts");
const { contentRuleIds } = await import("../src/authoring/catalog/gate/content-rules.ts");
type StructuralRule = Parameters<typeof runCatalogGate>[1]["rules"][number];
const structural: readonly StructuralRule[] = ["A", "B", "C", "L"];
const flag = process.argv.indexOf("--rules");
const requested = (process.argv[flag + 1] ?? "").split(",");
const structuralRules = structural.filter(rule => requested.includes(rule));
const contentRules = contentRuleIds.filter(rule => requested.includes(rule));
if (structuralRules.length + contentRules.length !== requested.length || !requested.length) {
  throw new Error(`CATALOG_GATE_USAGE: rules are ${[...structural, ...contentRuleIds].join(",")}`);
}
const tree = await runCatalogGate(root, { layout: DesertLayout, rules: structuralRules });
if (contentRules.length) await runContentRules(root, tree, { layout: DesertLayout, rules: contentRules });
console.log(`Catalog gate rules P,${requested.join(",")} passed: ${tree.paths.length} files, ${tree.declarations.length} declarations.`);
