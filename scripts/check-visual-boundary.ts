import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inventoryVisualSources, assertNoNewVisualDebt, assertQualifiedVisualOwnership,
  type VisualInventory } from "../src/authoring/visual-boundary/inventory.ts";
import { renderVisualInventory } from "../src/authoring/visual-boundary/report.ts";
import { runWithVisualBoundaries } from "../src/authoring/visual-boundary/source.ts";

const root = resolve(import.meta.dirname, "..");
const baseline = resolve(root, "docs/architecture/visual-ownership-debt.json");
const report = await inventoryVisualSources(root);
switch (process.argv[2]) {
  case "--closed-boundaries":
    await runWithVisualBoundaries(root, async () => undefined);
    console.log("Migrated closed component/adapter boundaries passed. Legacy ownership remains NOT QUALIFIED.");
    break;
  case "--write-audit":
    await writeFile(baseline, JSON.stringify(report, null, 2) + "\n");
    await writeFile(resolve(root, "docs/architecture/visual-ownership-inventory.md"), renderVisualInventory(report));
    console.log("Unqualified source inventory recorded. Existing violations remain unresolved; no release evidence was produced.");
    break;
  case "--no-new-debt":
    assertNoNewVisualDebt(report, JSON.parse(await readFile(baseline, "utf8")) as VisualInventory);
    console.log("No newly detected escapes. Global visual ownership remains NOT QUALIFIED.");
    break;
  case "--check": assertQualifiedVisualOwnership(report);
  default: throw new Error("Use --check, --closed-boundaries, --no-new-debt, or --write-audit");
}
