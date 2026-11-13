// An interrupted run is reclaimed next time, without touching young, live, foreign or linked directories.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { promiseMaxAge, promisePrefix, reapPromises } from "./promise-temporaries.ts";

type Cleanup = (root: string, now: number) => void;
const cleanup: Cleanup = (root, now) => reapPromises(root, now, pid => pid === process.pid);
function verify(clean: Cleanup): void {
  const root = mkdtempSync(join(tmpdir(), "desert-cleanup-check-"));
  const now = Date.now();
  const old = new Date(now - promiseMaxAge - 1000);
  const dead = `${promisePrefix}2147483647-old`;
  const fresh = `${promisePrefix}2147483647-young`;
  const live = `${promisePrefix}${process.pid}-live`;
  const linked = `${promisePrefix}2147483647-link`;
  const kept = [fresh, live, "foreign", "desert-promise-legacy", linked];
  try {
    for (const name of [dead, ...kept.filter(name => name !== linked)]) {
      mkdirSync(join(root, name));
      if (name !== fresh) utimesSync(join(root, name), old, old);
    }
    symlinkSync(join(root, "foreign"), join(root, linked));
    clean(root, now);
    expect(readdirSync(root).sort()).toEqual(kept.sort());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
describe("temporary houses after an interrupted run", () => {
  it("reclaims only old directories from this workspace whose owner has gone", () => verify(cleanup));
  it("detects a compiling cleanup that leaves abandoned directories", () => {
    expect(() => verify(() => {})).toThrow();
  });
  it("detects a compiling cleanup that deletes a young directory too", () => {
    expect(() => verify((root, now) => cleanup(root, now + promiseMaxAge * 2))).toThrow();
  });
  it("reclaims a house left by a killed process when it becomes old enough", () => {
    const root = mkdtempSync(join(tmpdir(), "desert-killed-check-"));
    const source = new URL("./promise-temporaries.ts", import.meta.url).href;
    try {
      const code = `import { promiseHome } from ${JSON.stringify(source)};
        promiseHome(); process.kill(process.pid, 'SIGKILL');`;
      const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], { env: { TMPDIR: root } });
      expect(child.signal).toBe("SIGKILL");
      const dirs = readdirSync(root);
      expect(dirs).toHaveLength(1);
      reapPromises(root);
      expect(readdirSync(root)).toEqual(dirs);
      const old = new Date(Date.now() - promiseMaxAge - 1000);
      for (const name of dirs) utimesSync(join(root, name), old, old);
      reapPromises(root);
      expect(readdirSync(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
