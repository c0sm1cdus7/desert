import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { programLaws, uncoveredCode } from "./program-laws.ts";
import { programLawOptions } from "./program-law-options.ts";
import { lawRepository, lawPackage, lawOptions } from "../../../tests/support/law-repository.ts";

it("runs all repository laws on a temporary program and catches a planted cycle", async () => {
  const repo = lawRepository({});
  expect(await programLaws(repo.root)).toEqual([]);
  writeFileSync(join(repo.root, "src/a.ts"), 'import "./a.ts";');
  expect(await programLaws(repo.root)).toContain("src/a.ts");
});
it.each(Object.keys(lawOptions))("names the missing mandatory option %s", async key => {
  const options = Object.fromEntries(Object.entries(lawOptions).filter(([name]) => name !== key));
  const repo = lawRepository({ "package.json": JSON.stringify({ ...lawPackage, desert: { laws: options } }) });
  await expect(programLaws(repo.root)).rejects.toThrow(`desert.laws.${key}`);
});
it("rejects malformed options, missing reasons and escaping repository paths", () => {
  const repo = lawRepository({});
  const invalid = {
    code: [],
    base: "../other",
    maxLines: 0,
    catalog: ["../other"],
    adapterUsers: { "src/a.ts": "" },
    exemptRules: { "src/a.ts": { reason: "", texts: ["never"] } },
  };
  for (const [key, value] of Object.entries(invalid)) {
    writeFileSync(
      join(repo.root, "package.json"),
      JSON.stringify({ ...lawPackage, desert: { laws: { ...lawOptions, [key]: value } } }),
    );
    expect(() => programLawOptions(repo.root)).toThrow(`desert.laws.${key}`);
  }
});
it("detects compiled startup code omitted from the law folders", () => {
  const repo = lawRepository({
    "arranque/start.ts": "export {};",
    "tsconfig.json": JSON.stringify({ include: ["src/**/*.ts", "arranque/**/*.ts"] }),
  });
  expect(uncoveredCode(repo, { base: null })).toEqual(["arranque/start.ts"]);
  expect(uncoveredCode({ ...repo, code: ["src", "arranque"] }, { base: null })).toEqual([]);
});

it.each([
  ["cycles", 'import "./a.ts";', "src/a.ts"],
  ["imports", 'import "../outside.ts";', "src/a.ts → ../outside.ts"],
  ["adapters", 'import "node:fs";', "src/a.ts → node:fs"],
  ["size", "const x = value as string;", "src/a.ts: value as string"],
  ["gate", 'it.only("focused", f);', "src/a.ts: it.only"],
  ["biases", 'const x = "A visible sentence";', "src/a.ts: A visible sentence"],
  ["prompts", 'const x = "never";', "src/a.ts: never"],
  [
    "messages",
    'import { defineMessage } from "./fields/messages.ts"; ' +
      'defineMessage({ id: "missing", kind: "text", parameters: {}, texts: {} });',
    "src/a.ts:missing:es",
  ],
])("automatically catches the %s violation in a temporary program", async (_law, source, violation) => {
  const repo = lawRepository({ "src/a.ts": source });
  expect(await programLaws(repo.root)).toContain(violation);
});

it("never lets a program switch the file-length cap off or raise it past the base's 300", () => {
  const repo = lawRepository({});
  for (const maxLines of [null, 301, Number.MAX_SAFE_INTEGER, 1.5]) {
    writeFileSync(
      join(repo.root, "package.json"),
      JSON.stringify({ ...lawPackage, desert: { laws: { ...lawOptions, maxLines } } }),
    );
    expect(() => programLawOptions(repo.root)).toThrow("desert.laws.maxLines");
  }
});
it("rejects adapter roots and a base that are not there, and a catalog that holds a code folder", () => {
  const repo = lawRepository({});
  const invalid: ReadonlyArray<readonly [string, unknown]> = [
    ["adapters", ["src/storage"]],
    ["base", "desert"],
    ["catalog", ["src/"]],
    ["catalog", ["src"]],
    ["catalog", ["."]],
  ];
  for (const [key, value] of invalid) {
    writeFileSync(
      join(repo.root, "package.json"),
      JSON.stringify({ ...lawPackage, desert: { laws: { ...lawOptions, [key]: value } } }),
    );
    expect(() => programLawOptions(repo.root)).toThrow(`desert.laws.${key}`);
  }
  mkdirSync(join(repo.root, "src/storage"));
  mkdirSync(join(repo.root, "desert"));
  for (const [key, value] of [
    ["adapters", ["src/storage"]],
    ["base", "desert"],
    ["catalog", ["src/texts/"]],
  ] as const) {
    writeFileSync(
      join(repo.root, "package.json"),
      JSON.stringify({ ...lawPackage, desert: { laws: { ...lawOptions, [key]: value } } }),
    );
    expect(programLawOptions(repo.root)[key]).toEqual(value);
  }
});
