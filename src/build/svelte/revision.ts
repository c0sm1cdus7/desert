import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { fileInventory, hash, digest } from "../files.ts";

export const sdkRoot = fileURLToPath(new URL("../../../", import.meta.url));
export function rendererRevision() {
  return digest({
    source: fileInventory(join(sdkRoot, "src")),
    lock: hash(readFileSync(join(sdkRoot, "package-lock.json"))),
    node: process.version,
  });
}
