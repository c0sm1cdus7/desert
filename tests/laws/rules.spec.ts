import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { root } from "../support/sources.ts";
import { debts, guarantees, rules, rulesText } from "./rules.ts";

const owed = rules.filter(rule => rule.guarantee === "debt");
const held = rules.filter(rule => rule.guarantee !== "debt");
describe("law 13: a rule nothing makes hold is a wish", () => {
  it("gives every law its text, its source and one guarantee of the closed set, under a number of its own", () => {
    expect(rules.filter(rule => !guarantees.some(known => known === rule.guarantee)).map(rule => rule.id)).toEqual([]);
    expect(rules.filter(rule => rule.rule.trim() === "" || rule.from.trim() === "").map(rule => rule.id)).toEqual([]);
    expect(new Set(rules.map(rule => rule.id)).size).toBe(rules.length);
  });
  it("points every guarantee at files that exist", () => {
    const lost = held.flatMap(({ id, evidence = [] }) =>
      evidence.length
        ? evidence.filter(file => !existsSync(join(root, file))).map(file => `${id}: ${file}`)
        : [`${id}`],
    );
    expect(lost).toEqual([]);
  });
  it("says how each debt will be paid, and counts them: the list only changes on purpose", () => {
    expect(owed.filter(rule => (rule.debt ?? "").trim() === "").map(rule => rule.id)).toEqual([]);
    expect(owed.length).toBe(debts);
  });
  it("holds each of the thirteen laws of the programs", () => {
    const laws = Array.from({ length: 13 }, (_, i) => `LEYES ${i + 1}`);
    expect(laws.filter(law => !rules.some(rule => rule.from === law))).toEqual([]);
  });
  it("keeps GARANTIAS.md as the list says: nobody edits it by hand", () => {
    expect(readFileSync(join(root, "GARANTIAS.md"), "utf8")).toBe(rulesText());
  });
});
