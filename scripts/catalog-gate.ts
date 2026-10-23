// Runs the Visual Catalog gate on this tree: node scripts/catalog-gate.ts [--rules A,B,C,L]. Rule P always runs first.
import { resolve } from "node:path";
import { assertGateSources } from "../src/authoring/catalog/gate/sources.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";

const root = resolve(import.meta.dirname, "..");
await assertGateSources(root, DesertLayout);
const { runCatalogGate } = await import("../src/authoring/catalog/gate/run.ts");
type CatalogRule = Parameters<typeof runCatalogGate>[1]["rules"][number];
const implemented: readonly CatalogRule[] = ["A", "B", "C", "L"];
const flag = process.argv.indexOf("--rules");
const requested = flag < 0 ? implemented : (process.argv[flag + 1] ?? "").split(",");
const rules = requested.filter((rule): rule is CatalogRule => implemented.some(known => known === rule));
if (rules.length !== requested.length || !rules.length) throw new Error(`CATALOG_GATE_USAGE: rules are ${implemented.join(",")}`);
const tree = await runCatalogGate(root, { layout: DesertLayout, rules });
console.log(`Catalog gate rules P,${rules.join(",")} passed: ${tree.paths.length} files, ${tree.declarations.length} declarations.`);
