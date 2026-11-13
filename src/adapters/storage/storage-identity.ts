// Every SQLite handle uses the same canonical filename, including its WAL and writer sidecar.
import { lstatSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
export function storageIdentity(file: string): string {
  if (file === ":memory:") return file;
  const entry = lstatSync(file, { throwIfNoEntry: false });
  if (!entry) return join(realpathSync(dirname(file)), basename(file));
  // realpath deliberately refuses dangling symbolic links instead of creating their target.
  const canonical = realpathSync(file);
  if (statSync(canonical).nlink > 1) throw new Error("A journal cannot have hard links");
  return canonical;
}
