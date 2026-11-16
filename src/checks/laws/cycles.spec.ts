import { lawRepository } from "../../../tests/support/law-repository.ts";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { importCycles, ringsOf, valueImports } from "./cycles.ts";

describe("law 21: no import cycles among the production files", () => {
  it("counts value imports, re-exports and dynamic imports, never the ones that bring only types", () => {
    const code = [
      'import { a } from "./a.ts";',
      'import type { B } from "./b.ts";',
      'import { type C } from "./c.ts";',
      'import { type D, d } from "./d.ts";',
      'import "./e.ts";',
      'export { f } from "./f.ts";',
      'export type { G } from "./g.ts";',
      'export * from "./h.ts";',
      'const i = import("./i.ts");',
      'type J = import("./j.ts").J;',
    ].join("\n");
    const source = ts.createSourceFile("ring.ts", code, ts.ScriptTarget.Latest, true);
    expect(valueImports(source)).toEqual(["./a.ts", "./d.ts", "./e.ts", "./f.ts", "./h.ts", "./i.ts"]);
  });

  it("finds a ring and a self-import, and leaves a chain alone", () => {
    const graph = new Map([
      ["check", ["frame"]],
      ["frame", ["turn"]],
      ["turn", ["check", "ids"]],
      ["ids", []],
      ["self", ["self"]],
      ["chain", ["ids"]],
    ]);
    expect(ringsOf(graph)).toEqual([["check", "frame", "turn"], ["self"]]);
  });

  it("reads the folders it is given, across them, and stops on a folder that is missing or empty", () => {
    const root = mkdtempSync(join(tmpdir(), "law-cycles-"));
    try {
      mkdirSync(join(root, "src"));
      mkdirSync(join(root, "arranque"));
      writeFileSync(join(root, "src", "a.ts"), 'import "./b.ts";');
      writeFileSync(join(root, "src", "b.ts"), 'import "../arranque/c.ts";');
      writeFileSync(join(root, "arranque", "c.ts"), 'import "../src/a.ts";');
      expect(importCycles({ root, code: ["src", "arranque"] })).toEqual(["arranque/c.ts ⇄ src/a.ts ⇄ src/b.ts"]);
      expect(importCycles({ root, code: ["src"] })).toEqual([]);
      expect(() => importCycles({ root, code: ["lib"] })).toThrow("no TypeScript file to check");
      expect(() => importCycles({ root, code: [] })).toThrow("no code folder named");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

it("rejects an existing empty code folder", () => {
  const repo = lawRepository({});
  mkdirSync(join(repo.root, "empty"));
  expect(() => importCycles({ ...repo, code: ["empty"] })).toThrow("no TypeScript file to check");
});
