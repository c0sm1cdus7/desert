import { mkdirSync, readFileSync, renameSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { home } from "../../tests/support/upgrade-support.ts";
import { projectionVersion } from "./projection-version.ts";

it("hashes contents and relative names, including hidden code, independently of roots and timestamps", () => {
  const a = home();
  const b = home();
  for (const root of [a, b]) {
    mkdirSync(join(root, ".code"));
    writeFileSync(join(root, ".code", "fold.ts"), "return 10");
  }
  const old = projectionVersion([a]);
  expect(projectionVersion([b])).toBe(old);
  utimesSync(join(a, ".code", "fold.ts"), 0, 0);
  expect(projectionVersion([a])).toBe(old);
  writeFileSync(join(a, ".code", "fold.ts"), "return 20");
  expect(projectionVersion([a])).not.toBe(old);
  const changed = projectionVersion([a]);
  renameSync(join(a, ".code", "fold.ts"), join(a, ".code", "renamed.ts"));
  expect(projectionVersion([a])).not.toBe(changed);
  expect(projectionVersion([a, b])).not.toBe(projectionVersion([a]));
  expect(readFileSync(join(b, ".code", "fold.ts"), "utf8")).toBe("return 10");
});

it("refuses absent roots, an empty declaration and links rather than skipping unmeasured code", () => {
  expect(() => projectionVersion([])).toThrow();
  expect(() => projectionVersion([join(home(), "absent")])).toThrow();
  const root = home();
  symlinkSync(home(), join(root, "linked"));
  expect(() => projectionVersion([root])).toThrow(/link/i);
});

it("includes the running Node version", () => {
  const root = home();
  const before = projectionVersion([root]);
  const node = process.versions.node;
  try {
    Object.defineProperty(process.versions, "node", { value: "other-node" });
    expect(projectionVersion([root])).not.toBe(before);
  } finally {
    Object.defineProperty(process.versions, "node", { value: node });
  }
});
