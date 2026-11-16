// The tree of src/ reads like a story: each production file planned with its purpose, each folder within its size.
import { readFileSync } from "node:fs";
import { basename, posix, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { filesUnder, isSpec, src } from "../support/sources.ts";
import { folderBudgets, tree } from "./tree.ts";
const files = filesUnder(src);
const production = files.filter(file => !isSpec(file));
const nameOf = (file: string): string => relative(src, file).split(sep).join("/");
const lines = (file: string): number => readFileSync(file, "utf8").replace(/\n$/, "").split("\n").length;
const totals = (): Map<string, number> => {
  const sizes = new Map<string, number>();
  for (const file of production) {
    const folder = posix.dirname(nameOf(file));
    sizes.set(folder, (sizes.get(folder) ?? 0) + lines(file));
  }
  return sizes;
};
describe("the tree of src/", () => {
  it("admits exactly the planned production files, each with a one-line purpose", () => {
    expect(production.map(nameOf).sort()).toEqual(Object.keys(tree).sort());
    const vague = Object.entries(tree).filter(([, purpose]) => purpose.trim() === "" || purpose.includes("\n"));
    expect(vague.map(([name]) => name)).toEqual([]);
  });
  it("keeps every folder within its budget, and budgets only the folders that exist", () => {
    const sizes = totals();
    const over = [...sizes].filter(([folder, size]) => size > (folderBudgets[folder] ?? 0));
    expect(over.map(([folder, size]) => `${folder}: ${size} > ${folderBudgets[folder] ?? 0}`)).toEqual([]);
    expect(Object.keys(folderBudgets).filter(folder => !sizes.has(folder))).toEqual([]);
  });
  // 518 since the first step. Union 1: +2 for an invalid amount (casa-limpieza); the reason «texto con algo visible»
  // moves from Identidades to every field and the invisible-scene promise goes to a neighbor test (−1).
  it("keeps every file within 200 lines and the texts within 519", () => {
    expect(files.filter(file => lines(file) > 200).map(nameOf)).toEqual([]);
    const texts = production.filter(file => nameOf(file).startsWith("texts/"));
    expect(texts.reduce((total, file) => total + lines(file), 0)).toBeLessThanOrEqual(519);
  });
  it("gives each production concern a unique filename, including text declarations", () => {
    const names = production.map(file => basename(file, ".ts"));
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });
});
