import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { jsonSnapshot } from "../json.ts";

export const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export const digest = (value: unknown) => hash(JSON.stringify(jsonSnapshot(value)));
export function fileInventory(directory: string, excluded: string[] = []) {
  const files: Record<string, string> = Object.create(null);
  function visit(relative: string) {
    const path = join(directory, relative);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error("BUILD_SYMLINK_REJECTED");
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(relative ? relative + "/" + name : name);
    } else if (!stat.isFile()) throw new Error("BUILD_SPECIAL_FILE_REJECTED");
    else if (!excluded.includes(relative)) files[relative] = hash(readFileSync(path));
  }
  visit("");
  return files;
}
