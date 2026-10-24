// node scripts/storage.ts --write | --check
// Writes or checks the generated infrastructure DDL. --check fails STORAGE_DERIVATION when the file differs.
import { readFile, writeFile } from "node:fs/promises";
import { infrastructureDdlPath, renderInfrastructureDdl } from "../src/storage/render-ddl.ts";

const mode = process.argv[2];
const path = new URL(`../${infrastructureDdlPath}`, import.meta.url);
const expected = renderInfrastructureDdl();

if (mode === "--write") {
  await writeFile(path, expected);
} else if (mode === "--check") {
  const actual = await readFile(path, "utf8").catch(() => "");
  if (actual !== expected) {
    process.stderr.write(`STORAGE_DERIVATION: ${infrastructureDdlPath}: differs from the declaration; run node scripts/storage.ts --write\n`);
    process.exitCode = 1;
  }
} else {
  process.stderr.write("usage: node scripts/storage.ts --write | --check\n");
  process.exitCode = 2;
}
