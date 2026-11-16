import { afterEach, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
const homes: string[] = [];
afterEach(() => homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true })));
for (const mode of ["die", "slow"])
  it(`hcrash: SIGKILL ${mode} conserva solo referencias y reabre`, () => {
    const home = mkdtempSync(join(tmpdir(), "a01-action-cut-"));
    homes.push(home);
    const script = fileURLToPath(new URL("../../../tests/support/secret-crash.ts", import.meta.url));
    const killed = spawnSync(process.execPath, [script, home, mode], { encoding: "utf8" });
    expect(killed.signal, killed.stderr).toBe("SIGKILL");
    const checkBytes = () => {
      for (const file of readdirSync(home).filter(name => name.startsWith("journal.sqlite")))
        expect(readFileSync(join(home, file)).includes(Buffer.from("QZ"))).toBe(false);
    };
    checkBytes();
    const reopened = spawnSync(process.execPath, [script, home, "reopen"], { encoding: "utf8" });
    expect(reopened.status, reopened.stderr).toBe(0);
    expect(reopened.stdout).not.toContain("QZ");
    expect(reopened.stdout).toContain('"status":"interrupted"');
    expect(reopened.stdout).toContain('"status":"accepted"');
    checkBytes();
  });
