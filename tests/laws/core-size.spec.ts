// Each production file names its purpose; folders group concerns rather than enforce a line budget.
import { readFileSync } from "node:fs";
import { basename, posix, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { filesUnder, isSpec, src } from "../support/sources.ts";
import { tree } from "./tree.ts";
const files = filesUnder(src);
const production = files.filter(file => !isSpec(file));
const nameOf = (file: string): string => relative(src, file).split(sep).join("/");
const lines = (file: string): number => readFileSync(file, "utf8").replace(/\n$/, "").split("\n").length;
describe("the tree of src/", () => {
  it("admits exactly the planned production files, each with a one-line purpose", () => {
    expect(production.map(nameOf).sort()).toEqual(Object.keys(tree).sort());
    const vague = Object.entries(tree).filter(([, purpose]) => purpose.trim() === "" || purpose.includes("\n"));
    expect(vague.map(([name]) => name)).toEqual([]);
  });
  it("groups at least two production files per folder, except the package root awaiting index.ts", () => {
    const folders = new Map<string, string[]>();
    for (const file of production) {
      const folder = posix.dirname(nameOf(file));
      folders.set(folder, [...(folders.get(folder) ?? []), nameOf(file)]);
    }
    const indexed = production.some(file => nameOf(file) === "index.ts");
    expect([...folders].filter(([folder, files]) => (folder !== "." || indexed) && files.length === 1)).toEqual([]);
  });
  // The signed move changes file size, but preserves the complete 519-line text budget.
  it("keeps every file within 300 lines and the texts within 519", () => {
    expect(files.filter(file => lines(file) > 300).map(nameOf)).toEqual([]);
    const texts = production.filter(file => nameOf(file).startsWith("texts/"));
    expect(texts.reduce((total, file) => total + lines(file), 0)).toBeLessThanOrEqual(519);
  });
  it("gives each production concern a unique filename, including text declarations", () => {
    const names = production.map(file => basename(file, ".ts"));
    const repeated = names.filter((name, index) => names.indexOf(name) !== index);
    // The signed partition names both catalogs facts.ts; every other concern keeps its unique filename.
    expect(repeated).toEqual(["facts"]);
    expect(
      production
        .filter(file => basename(file) === "facts.ts")
        .map(nameOf)
        .sort(),
    ).toEqual(["house/facts.ts", "journal/facts.ts"]);
  });
});
