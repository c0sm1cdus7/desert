import { afterEach, assert, expect, it } from "vitest";
import { isRecord } from "../../fields/json-values.ts";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
const homes: string[] = [];
// Dos bytes pueden coincidir con los checksums binarios de SQLite sin que se haya guardado material.
const marker = "QZ-SYNTHETIC-CRASH-MATERIAL-7e76329a-d04b-49a5-bc60-85934c7e01f2";
afterEach(() => homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true })));
for (const mode of ["die", "slow"])
  it(`hcrash: SIGKILL ${mode} conserva solo referencias y reabre`, () => {
    const home = mkdtempSync(join(tmpdir(), "a01-action-cut-"));
    homes.push(home);
    const script = fileURLToPath(new URL("../../../tests/support/secret-crash.ts", import.meta.url));
    const killed = spawnSync(process.execPath, [script, home, mode, marker], { encoding: "utf8" });
    expect(killed.signal, killed.stderr).toBe("SIGKILL");
    const checkBytes = () => {
      for (const file of readdirSync(home).filter(name => name.startsWith("journal.sqlite"))) {
        const offset = readFileSync(join(home, file)).indexOf(Buffer.from(marker));
        expect(offset, `Material sintético en ${file}, posición ${offset}`).toBe(-1);
      }
    };
    checkBytes();
    const reopened = spawnSync(process.execPath, [script, home, "reopen", marker], { encoding: "utf8" });
    expect(reopened.status, reopened.stderr).toBe(0);
    expect(reopened.stdout).not.toContain(marker);
    const facts: unknown = JSON.parse(reopened.stdout);
    assert(Array.isArray(facts), "La reapertura devuelve los hechos del diario");
    for (const option of [mode, "set"]) {
      const event: unknown = facts.find(
        (fact: unknown) => isRecord(fact) && fact.kind === "act" && isRecord(fact.data) && fact.data.option === option,
      );
      expect(event).toHaveProperty("data.input.value", expect.stringMatching(/^secret:[0-9a-f-]{36}$/));
    }
    expect(reopened.stdout).toContain('"status":"interrupted"');
    expect(reopened.stdout).toContain('"status":"accepted"');
    checkBytes();
  });
