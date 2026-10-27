// node scripts/storage.ts --write | --check | plan
// --write writes the generated DDL and storage model: the infrastructure, and one object file and one model per stored
// product, installation language and digest. plan writes them too, plus the migration from the digest the committed
// history ends at to the current one (src/storage/migration-history.ts), using the installation's declared decisions.
// --check fails STORAGE_DERIVATION when a generated file differs from the declarations, MIGRATION_EDITED,
// MIGRATION_PLAN_MISSING, MIGRATION_DECISION_REQUIRED or MIGRATION_DECISION_UNUSED when the migration history is not whole,
// and UNDECLARED_SQL when the repository holds hand-written SQL (src/storage/undeclared-sql.ts).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { objectDdlPath, renderObjectDdl } from "../src/storage/ddl.ts";
import { checkHistory, planNext } from "../src/storage/migration-history.ts";
import { modelPath, renderModel, storageModel } from "../src/storage/model.ts";
import { infrastructureDdlPath, renderInfrastructureDdl } from "../src/storage/render-ddl.ts";
import { formatSqlViolation, readSqlTree, undeclaredSql } from "../src/storage/undeclared-sql.ts";
import { storedInstallations } from "./storage-products.ts";

const root = new URL("../", import.meta.url);
const mode = process.argv[2];
const products = storedInstallations.flatMap(({ installation, products: definitions, decisions }) =>
  definitions.map(definition => ({ definition, installation, decisions: decisions[storageModel(definition, installation).product] ?? [] })));
const expected = new Map([[infrastructureDdlPath, renderInfrastructureDdl()],
  ...products.flatMap(({ definition, installation }) => {
    const model = storageModel(definition, installation);
    return [[objectDdlPath(definition, installation), renderObjectDdl(definition, installation)], [modelPath(model), renderModel(model)]] as const;
  })]);
const write = async (files: Iterable<readonly [string, string]>) => {
  for (const [path, content] of files) {
    await mkdir(new URL(".", new URL(path, root)), { recursive: true });
    await writeFile(new URL(path, root), content);
  }
};

if (mode === "--write") {
  await write(expected);
} else if (mode === "plan") {
  // Every step is planned before anything is written: a refused plan leaves the repository as it was.
  const steps = products.map(({ definition, installation, decisions }) => planNext(root, definition, installation, decisions));
  await write(expected);
  await write(steps.flatMap(step => step.migration ? [[step.migration.path, step.migration.text] as const] : []));
  for (const step of steps) process.stdout.write(step.migration ? `planned ${step.migration.path}\n` : `${step.current.product}.${step.current.language}: nothing to plan\n`);
} else if (mode === "--check") {
  for (const [path, content] of expected) {
    const actual = await readFile(new URL(path, root), "utf8").catch(() => "");
    if (actual !== content) {
      process.stderr.write(`STORAGE_DERIVATION: ${path}: differs from the declaration; run node scripts/storage.ts --write\n`);
      process.exitCode = 1;
    }
  }
  for (const { definition, installation, decisions } of products) {
    for (const problem of checkHistory(root, definition, installation, decisions)) {
      process.stderr.write(`${problem}\n`);
      process.exitCode = 1;
    }
  }
  for (const violation of undeclaredSql(await readSqlTree(fileURLToPath(root)))) {
    process.stderr.write(`${formatSqlViolation(violation)}\n`);
    process.exitCode = 1;
  }
} else {
  process.stderr.write("usage: node scripts/storage.ts --write | --check | plan\n");
  process.exitCode = 2;
}
