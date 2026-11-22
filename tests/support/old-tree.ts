// Extract the source and tests of an earlier commit of this repository, with local dependencies and no installation.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
export function oldTree(commit: string): Readonly<{ root: string; base: string; close: () => void }> {
  const root = mkdtempSync("/tmp/desert-old-tree-");
  const base = join(root, "base");
  mkdirSync(base);
  try {
    const archive = execFileSync("git", ["archive", commit, "src", "tests", "package.json"], {
      maxBuffer: 32 * 1024 * 1024,
    });
    execFileSync("tar", ["-xf", "-", "-C", base], { input: archive });
    symlinkSync(resolve("node_modules"), join(base, "node_modules"));
    return { root, base, close: () => rmSync(root, { recursive: true, force: true }) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}
