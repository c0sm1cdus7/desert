// node scripts/storage.ts --write | --check
// Writes or checks the generated DDL: the infrastructure, and one object file per stored product and installation digest.
// --check fails STORAGE_DERIVATION when a file differs from what the declarations generate.
import { readFile, writeFile } from "node:fs/promises";
import { objectDdlPath, renderObjectDdl } from "../src/storage/ddl.ts";
import { infrastructureDdlPath, renderInfrastructureDdl } from "../src/storage/render-ddl.ts";
import { storedProducts } from "./storage-products.ts";

const mode = process.argv[2];
const expected = new Map([[infrastructureDdlPath, renderInfrastructureDdl()],
  ...storedProducts.map(definition => [objectDdlPath(definition), renderObjectDdl(definition)] as const)]);

if (mode === "--write") {
  for (const [path, content] of expected) await writeFile(new URL(`../${path}`, import.meta.url), content);
} else if (mode === "--check") {
  for (const [path, content] of expected) {
    const actual = await readFile(new URL(`../${path}`, import.meta.url), "utf8").catch(() => "");
    if (actual !== content) {
      process.stderr.write(`STORAGE_DERIVATION: ${path}: differs from the declaration; run node scripts/storage.ts --write\n`);
      process.exitCode = 1;
    }
  }
} else {
  process.stderr.write("usage: node scripts/storage.ts --write | --check\n");
  process.exitCode = 2;
}
