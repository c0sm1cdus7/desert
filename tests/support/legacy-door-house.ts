// Extract only historical source and test code from this repository, with local dependencies and no installation.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
export function legacyDoorHouse() {
  const root = mkdtempSync("/tmp/desert-legacy-door-");
  const base = join(root, "base"),
    home = join(root, "house");
  mkdirSync(base);
  mkdirSync(home);
  try {
    const archive = execFileSync("git", ["archive", "6a16b19", "src", "tests", "package.json"], {
      maxBuffer: 32 * 1024 * 1024,
    });
    execFileSync("tar", ["-xf", "-", "-C", base], { input: archive });
    symlinkSync(resolve("node_modules"), join(base, "node_modules"));
    execFileSync(process.execPath, [resolve("tests/support/seed-legacy-door.mjs"), base, home], { stdio: "pipe" });
    return { home, close: () => rmSync(root, { recursive: true, force: true }) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}
