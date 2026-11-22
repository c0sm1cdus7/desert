// A house journal written by the old action engine in the old stored names, migrated unless the caller asks otherwise.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { migrateStoredNames } from "../../src/runtime/stored-names.ts";
import { oldTree } from "./old-tree.ts";
export function legacyDoorHouse(options: Readonly<{ migrate: boolean }> = { migrate: true }) {
  const tree = oldTree("6a16b19");
  const home = join(tree.root, "house"),
    backups = join(tree.root, "backups");
  mkdirSync(home);
  mkdirSync(backups);
  try {
    execFileSync(process.execPath, [resolve("tests/support/seed-legacy-door.mjs"), tree.base, home], { stdio: "pipe" });
    if (options.migrate) migrateStoredNames(join(home, "journal.sqlite"), "house", backups);
    return { home, backups, close: tree.close };
  } catch (error) {
    rmSync(tree.root, { recursive: true, force: true });
    throw error;
  }
}
