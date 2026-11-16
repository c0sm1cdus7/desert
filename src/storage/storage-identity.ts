// Every SQLite handle uses the same canonical filename, including its WAL and writer sidecar.
import { sqliteFiles } from "./sqlite-files.ts";
import { lstatSync, realpathSync } from "node:fs";
import { basename, dirname, join } from "node:path";
export function storageIdentity(file: string): string {
  if (file === ":memory:") return file;
  const entry = lstatSync(file, { throwIfNoEntry: false });
  if (!entry) {
    const canonical = join(realpathSync(dirname(file)), basename(file));
    sqliteFiles(canonical);
    return canonical;
  }
  // realpath deliberately refuses dangling symbolic links instead of creating their target.
  const canonical = realpathSync(file);
  sqliteFiles(canonical);
  return canonical;
}
