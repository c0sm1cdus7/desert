import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadVerifiedBuild } from "./manifest.ts";
import { digest } from "./files.ts";

export function snapshotBuild(source: string) {
  const original = loadVerifiedBuild(source);
  const directory = mkdtempSync(join(tmpdir(), "desert-served-build-"));
  try {
    cpSync(source, directory, { recursive: true, errorOnExist: true, force: false });
    const manifest = loadVerifiedBuild(directory);
    if (digest(manifest) !== digest(original)) throw new Error("BUILD_CHANGED_DURING_LOAD");
    return { directory, manifest, close() { rmSync(directory, { recursive: true }); } };
  } catch (error) { rmSync(directory, { recursive: true }); throw error; }
}
