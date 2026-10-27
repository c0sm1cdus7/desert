// A throwaway repository root holding only what the migration history reads: src/storage/generated/*.json models and
// src/storage/migrations/*.sql. Each step is what `node scripts/storage.ts plan` writes for a declaration change.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ClientInstallation } from "../../src/storage/client-installation.ts";
import { planNext } from "../../src/storage/migration-history.ts";
import { readMigrations, type Migration } from "../../src/storage/migrations.ts";
import { modelPath, renderModel, storageModel } from "../../src/storage/model.ts";

export function repository() {
  const directory = mkdtempSync(join(tmpdir(), "desert-migrations-"));
  for (const path of ["src/storage/generated", "src/storage/migrations"]) mkdirSync(join(directory, path), { recursive: true });
  const root = pathToFileURL(`${directory}/`);
  const write = (path: string, text: string) => writeFileSync(new URL(path, root), text);
  return {
    root,
    read: (path: string) => readFileSync(new URL(path, root), "utf8"),
    write,
    /** `--write` for `product`: its model only. */
    model(product: unknown, installation: ClientInstallation) {
      const model = storageModel(product, installation);
      write(modelPath(model), renderModel(model));
      return model;
    },
    /** `plan` for `product`: the next migration (if any) and the model; returns the migration path. */
    plan(product: unknown, installation: ClientInstallation, decisions: readonly unknown[] = []) {
      const step = planNext(root, product, installation, decisions);
      this.model(product, installation);
      if (step.migration) write(step.migration.path, step.migration.text);
      return step.migration?.path;
    },
    migrations: (): readonly Migration[] => readMigrations(root),
    dispose: () => rmSync(directory, { recursive: true, force: true }),
  };
}
export type Repository = ReturnType<typeof repository>;
