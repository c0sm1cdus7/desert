import { linkSync, mkdirSync, readFileSync, renameSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { home } from "../../tests/support/upgrade-support.ts";
import { projectionVersion } from "./projection-version.ts";
it("hashes regular code contents and relative names independently of roots and timestamps", () => {
  const a = home();
  const b = home();
  for (const root of [a, b]) {
    mkdirSync(join(root, "code"));
    writeFileSync(join(root, "code", "fold.ts"), "return 10");
  }
  const old = projectionVersion([a]);
  expect(projectionVersion([b])).toBe(old);
  utimesSync(join(a, "code", "fold.ts"), 0, 0);
  expect(projectionVersion([a])).toBe(old);
  writeFileSync(join(a, "code", "fold.ts"), "return 20");
  expect(projectionVersion([a])).not.toBe(old);
  const changed = projectionVersion([a]);
  renameSync(join(a, "code", "fold.ts"), join(a, "code", "renamed.ts"));
  expect(projectionVersion([a])).not.toBe(changed);
  expect(projectionVersion([a, b])).not.toBe(projectionVersion([a]));
  expect(readFileSync(join(b, "code", "fold.ts"), "utf8")).toBe("return 10");
});
it("refuses absent roots, empty declarations, symbolic links and hard links", () => {
  expect(() => projectionVersion([])).toThrow();
  expect(() => projectionVersion([join(home(), "absent")])).toThrow();
  const root = home();
  symlinkSync(home(), join(root, "linked"));
  expect(() => projectionVersion([root])).toThrow(/link/i);
  const target = join(home(), "code.ts");
  writeFileSync(target, "1");
  linkSync(target, join(home(), "alias.ts"));
  expect(() => projectionVersion([target])).toThrow(/hard links/i);
});
it("excludes hidden files, hidden subtrees and undeclared extensions", () => {
  const root = home();
  writeFileSync(join(root, "fold.ts"), "10");
  const before = projectionVersion([root], [".ts"]);
  mkdirSync(join(root, ".hidden"));
  writeFileSync(join(root, ".hidden", "fold.ts"), "20");
  writeFileSync(join(root, ".DS_Store"), "metadata");
  writeFileSync(join(root, "data.json"), "20");
  expect(projectionVersion([root], [".ts"])).toBe(before);
  expect(projectionVersion([root], [".ts", ".json"])).not.toBe(before);
});
it("accepts declared standalone dependency files and changes when their bytes change", () => {
  const file = join(home(), "pnpm-lock.yaml");
  writeFileSync(file, "version: 1");
  const before = projectionVersion([file], [".yaml"]);
  writeFileSync(file, "version: 2");
  expect(projectionVersion([file], [".yaml"])).not.toBe(before);
});
it.each(["root", "nested", "file", "parent-alias", "hidden"])(
  "rejects organization trees via %s before reading",
  mode => {
    const root = home();
    const org = join(root, mode === "hidden" ? ".org" : "org");
    const code = join(org, "code");
    mkdirSync(code, { recursive: true });
    writeFileSync(join(org, "journal.sqlite"), "not opened");
    writeFileSync(join(code, "fold.ts"), "10");
    const alias = join(home(), "code");
    symlinkSync(code, alias);
    const paths = new Map([
      ["root", root],
      ["nested", code],
      ["file", join(code, "fold.ts")],
      ["parent-alias", join(alias, "fold.ts")],
    ]);
    const path = paths.get(mode) ?? root;
    expect(() => projectionVersion([path])).toThrow(/organization|journal/i);
  },
);
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
