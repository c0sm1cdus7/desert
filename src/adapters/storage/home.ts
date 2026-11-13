// Only SQLite opens and closes database files: a foreign close would release POSIX locks on the same inode.
import { chmodSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { privateFileMode } from "../../catalogs/levers.ts";
export function privateDatabase(file: string): DatabaseSync {
  const db = new DatabaseSync(file);
  try {
    if (file !== ":memory:") chmodSync(file, privateFileMode);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
