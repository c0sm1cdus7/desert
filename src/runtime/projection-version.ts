// SHA-256 covers declared regular code files, their relative names and Node, in a fixed traversal order.
/** Bump whenever the base changes how its own facts fold. */
export const baseProjectionVersion = "desert/16";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { codeFiles } from "./code-files.ts";
export const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"] as const;
export function projectionVersion(trees: readonly string[], extensions: readonly string[] = codeExtensions): string {
  const files = codeFiles(trees, extensions);
  const hash = createHash("sha256");
  const frame = (value: string | Uint8Array) => {
    const bytes = typeof value === "string" ? Buffer.from(value) : value;
    hash.update(`${bytes.length}:`);
    hash.update(bytes);
  };
  frame("desert-code-trees/2");
  frame(process.versions.node);
  for (const { file, name } of files) {
    frame(name);
    frame(readFileSync(file));
  }
  return hash.digest("hex");
}
