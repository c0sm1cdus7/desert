// Runs the Visual Catalog gate on this tree, the same rules the build runs: node scripts/catalog-gate.ts [--rules A,B,C,L,D,...]
// Rule P always runs first. Structural rules (A, B, C, L) stop at the first error; content rules (D–T) report every
// violation with counts per code (scripts/catalog-violations.ts groups them with examples).
import { resolve } from "node:path";
import { assertGateSources } from "../src/authoring/catalog/gate/sources.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";

const root = resolve(import.meta.dirname, "..");
await assertGateSources(root, DesertLayout);
const { runCatalogGate, runContentRules } = await import("../src/authoring/catalog/gate/run.ts");
const { contentRuleIds } = await import("../src/authoring/catalog/gate/content-rules.ts");
type StructuralRule = Parameters<typeof runCatalogGate>[1]["rules"][number];
const structural: readonly StructuralRule[] = ["A", "B", "C", "L"];
const flag = process.argv.indexOf("--rules");
const requested = flag < 0 ? [...structural, ...contentRuleIds] : (process.argv[flag + 1] ?? "").split(",");
const structuralRules = structural.filter(rule => requested.includes(rule));
const contentRules = contentRuleIds.filter(rule => requested.includes(rule));
if (structuralRules.length + contentRules.length !== requested.length || !requested.length) {
  throw new Error(`CATALOG_GATE_USAGE: rules are ${[...structural, ...contentRuleIds].join(",")}`);
}
const tree = await runCatalogGate(root, { layout: DesertLayout, rules: structuralRules });
if (contentRules.length) await runContentRules(root, tree, { layout: DesertLayout, rules: contentRules });
console.log(`Catalog gate rules P,${requested.join(",")} passed: ${tree.paths.length} files, ${tree.declarations.length} declarations.`);
