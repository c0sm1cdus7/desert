// The Visual Catalog command: node scripts/catalog.ts --write | --check | status
//   --write   regenerate the catalog index, manifest and types from the declarations
//   --check   regenerate in memory and compare (rule C), the same comparison the build runs
//   status    the ledger status of every piece and specimen
// `approve` is the owner's command and arrives with digest verification (slice 1).
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { generateCatalog } from "../src/authoring/catalog/generate.ts";
import { assertLedgerStructure } from "../src/authoring/catalog/gate/ledger.ts";
import { readCatalogTree, runCatalogGate } from "../src/authoring/catalog/gate/run.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";

const root = resolve(import.meta.dirname, "..");
const [command, ...rest] = process.argv.slice(2);
if (rest.length || !command || !["--write", "--check", "status"].includes(command)) throw new Error("CATALOG_USAGE: --write | --check | status");

if (command === "--write") {
  const tree = await readCatalogTree(root, DesertLayout);
  for (const file of generateCatalog(tree.declarations, DesertLayout)) {
    await mkdir(dirname(resolve(root, file.path)), { recursive: true });
    await writeFile(resolve(root, file.path), file.source);
  }
}
if (command === "--write" || command === "--check") {
  const tree = await runCatalogGate(root, { layout: DesertLayout, rules: ["C"] });
  console.log(`Catalog ${command === "--write" ? "generated and checked" : "checked"}: ${tree.declarations.length} declarations.`);
}
if (command === "status") {
  const tree = await readCatalogTree(root, DesertLayout);
  const ledger = assertLedgerStructure(tree.ledger, tree.declarations);
  for (const [id, entry] of Object.entries(ledger.pieces).sort(([left], [right]) => left < right ? -1 : 1)) {
    console.log(`${id}\t${entry.status}`);
    const specimens = "specimens" in entry ? entry.specimens ?? {} : {};
    for (const [specimen, status] of Object.entries(specimens)) console.log(`  ${specimen}\t${status}`);
  }
}
