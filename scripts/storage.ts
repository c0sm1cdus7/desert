// node scripts/storage.ts --write | --check
// Writes or checks the generated DDL: the infrastructure, and one object file per stored product, installation language and
// digest. --check fails STORAGE_DERIVATION when a file differs from what the declarations generate, and UNDECLARED_SQL
// when the repository holds hand-written SQL (src/storage/undeclared-sql.ts).
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { objectDdlPath, renderObjectDdl } from "../src/storage/ddl.ts";
import { infrastructureDdlPath, renderInfrastructureDdl } from "../src/storage/render-ddl.ts";
import { formatSqlViolation, readSqlTree, undeclaredSql } from "../src/storage/undeclared-sql.ts";
import { storedInstallations } from "./storage-products.ts";

const mode = process.argv[2];
const expected = new Map([[infrastructureDdlPath, renderInfrastructureDdl()],
  ...storedInstallations.flatMap(({ installation, products }) => products.map(definition =>
    [objectDdlPath(definition, installation), renderObjectDdl(definition, installation)] as const))]);

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
  for (const violation of undeclaredSql(await readSqlTree(fileURLToPath(new URL("../", import.meta.url))))) {
    process.stderr.write(`${formatSqlViolation(violation)}\n`);
    process.exitCode = 1;
  }
} else {
  process.stderr.write("usage: node scripts/storage.ts --write | --check\n");
  process.exitCode = 2;
}
