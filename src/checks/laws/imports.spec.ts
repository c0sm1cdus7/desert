import { strayImports } from "./imports.ts";
import { lawRepository, baseImportOptions } from "../../../tests/support/law-repository.ts";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { root, src } from "../../../tests/support/sources.ts";
import { importsIn, forbidden as rejects } from "./imports.ts";
const forbidden = (file: string, specifier: string): boolean =>
  rejects({ root, code: ["src"] }, baseImportOptions, file, specifier);

describe("law 2: explicit dependencies and isolated adapters", () => {
  it("detects imports hidden behind type queries, re-exports and require", () => {
    const code = [
      'import type { Event } from "../../kenon.events.ts";',
      'export { Clock } from "../../outside/clock.ts";',
      'type Old = import("../../outside/journal.ts").Journal;',
      'const old = import("../../outside/journal.ts");',
      'const other = require("../../outside/clock.ts");',
      'import old = require("../../kenon.functions.ts");',
      "const unknown = import(path);",
    ].join("\n");
    const file = join(src, "journal", "fixture.ts");
    const imports = importsIn(ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true));
    expect(imports).toHaveLength(7);
    expect(imports.every(specifier => forbidden(file, specifier))).toBe(true);
    expect(forbidden(file, "./facts.ts")).toBe(false);
    expect(forbidden(file, "node:sqlite")).toBe(false);
    expect(forbidden(file, "../adapters/providers/providers.ts")).toBe(true);
    expect(forbidden(join(src, "runtime", "house-runtime.ts"), "../adapters/providers/providers.ts")).toBe(false);
    expect(forbidden(join(src, "tools", "web", "search.ts"), "../../adapters/providers/reply.ts")).toBe(false);
    expect(forbidden(join(src, "surface", "bridge", "start.ts"), "../../storage/home.ts")).toBe(false);
    expect(forbidden(join(src, "surface", "screen.ts"), "../storage/home.ts")).toBe(true);
    expect(forbidden(join(src, "mind", "turn.ts"), "../adapters/providers/reply.ts")).toBe(true);
    expect(forbidden(join(src, "cli.ts"), "./storage/home.ts")).toBe(true);
    expect(forbidden(file, "@sinclair/typebox")).toBe(false);
    expect(forbidden(file, "../../../tests/support/next-tools.ts")).toBe(true);
    expect(
      forbidden(join(src, "surface", "bridge", "house-tools.spec.ts"), "../../../tests/support/next-tools.ts"),
    ).toBe(false);
    expect(forbidden(join(src, "mind", "turn.spec.ts"), "../adapters/providers/reply.ts")).toBe(false);
  });
});

it("catches dependencies across a program and the current base adapter roots", () => {
  const repo = lawRepository({
    "src/a.ts": 'import { x } from "#desert/storage/x.ts"; import { y } from "#desert/keychain/y.ts";',
    "desert/src/storage/x.ts": "export const x = 1;",
    "desert/src/keychain/y.ts": "export const y = 1;",
    "arranque/start.ts": 'import "../src/a.ts";',
    "package.json": JSON.stringify({ type: "module", imports: { "#desert/*": "./desert/src/*" } }),
  });
  const options = { base: "desert", adapters: [], adapterUsers: {} };
  expect(strayImports({ ...repo, code: ["src", "arranque"] }, options)).toEqual([
    "src/a.ts → #desert/storage/x.ts",
    "src/a.ts → #desert/keychain/y.ts",
  ]);
  expect(strayImports(repo, { ...options, adapterUsers: { "src/a.ts": "Composition" } })).toEqual([]);
  expect(strayImports(repo, { ...options, adapterUsers: { "gone.ts": "Composition" } })).toContain("gone.ts");
});
