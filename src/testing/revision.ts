import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function mechanismRevision() {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const sources: [string, string][] = [];
  function visit(directory: string) {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = directory + "/" + entry.name;
      if (entry.isSymbolicLink()) throw new Error("SYMLINK_IN_VERIFICATION_SOURCE");
      if (entry.isDirectory()) visit(path);
      else sources.push([path, createHash("sha256").update(readFileSync(join(root, path))).digest("hex")]);
    }
  }
  visit("src");
  for (const path of ["package.json", "package-lock.json"]) {
    sources.push([path, createHash("sha256").update(readFileSync(join(root, path))).digest("hex")]);
  }
  return digest({ sources: sources.sort(([a], [b]) => a.localeCompare(b)), node: process.version,
    platform: process.platform, arch: process.arch, flags: process.execArgv });
}
