// Runs the Visual Catalog gate on this tree. Without arguments it calls exactly what the build calls
// (runWithVisualBoundaries: P, A–L, the previous gate, D–T). With --rules A,B,C,L,D,... it runs only those rules.
// Structural rules stop at the first error; content rules report every violation (scripts/catalog-violations.ts groups them).
import { resolve } from "node:path";
import { assertGateSources } from "../src/authoring/catalog/gate/sources.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";

const root = resolve(import.meta.dirname, "..");
if (!process.argv.includes("--rules")) {
  const { runWithVisualBoundaries } = await import("../src/authoring/visual-boundary/source.ts");
  await runWithVisualBoundaries(root, async () => undefined);
  console.log("Catalog gate passed: the same gate the build runs.");
  process.exit(0);
}
await assertGateSources(root, DesertLayout);
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
