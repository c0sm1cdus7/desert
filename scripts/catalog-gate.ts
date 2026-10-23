// Runs the Visual Catalog gate on this tree: node scripts/catalog-gate.ts [--rules A,B,L]
import { resolve } from "node:path";
import { runCatalogGate, type CatalogRule } from "../src/authoring/catalog/gate/run.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";

const implemented: readonly CatalogRule[] = ["A", "B", "L"];
const flag = process.argv.indexOf("--rules");
const requested = flag < 0 ? implemented : (process.argv[flag + 1] ?? "").split(",");
const rules = requested.filter((rule): rule is CatalogRule => implemented.some(known => known === rule));
if (rules.length !== requested.length || !rules.length) throw new Error(`CATALOG_GATE_USAGE: rules are ${implemented.join(",")}`);
const tree = await runCatalogGate(resolve(import.meta.dirname, ".."), { layout: DesertLayout, rules });
console.log(`Catalog gate rules ${rules.join(",")} passed: ${tree.paths.length} files, ${tree.declarations.length} declarations.`);
