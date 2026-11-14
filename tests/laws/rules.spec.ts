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
  it("holds each law of the programs that LEYES.md lists, however many they are", () => {
    const listed = Array.from(readFileSync(join(root, "LEYES.md"), "utf8").matchAll(/^\| (\d+) \|/gmu), ([, n]) => n);
    const kept = (law: string | undefined): boolean =>
      rules.some(rule => rule.from === `LEYES ${law}` || rule.from.startsWith(`LEYES ${law} ·`));
    expect(listed.length).toBeGreaterThan(0);
    expect(listed).toEqual(listed.map((_, i) => String(i + 1)));
    expect(listed.filter(law => !kept(law))).toEqual([]);
  });
  it("names, for every law a spec makes hold, a spec that exists", () => {
    const bare = rules.filter(
      ({ guarantee, evidence = [] }) =>
        guarantee === "spec" && !evidence.some(file => /\.(spec|checks)\.ts$/u.test(file)),
    );
    expect(bare.map(rule => rule.id)).toEqual([]);
  });
  it("keeps GARANTIAS.md as the list says: nobody edits it by hand", () => {
    expect(readFileSync(join(root, "GARANTIAS.md"), "utf8")).toBe(rulesText());
  });
});

it("records law 255 for reading confirmed money and rejecting invalid cents", () => {
  const law = rules.find(rule => rule.id === 255);
  expect(law?.rule).toBe(
    "Un programa lee el mismo importe que confirmó, antes y después de reabrir, " +
      "y la función que lo muestra rechaza lo que no es un importe.",
  );
  expect(law?.evidence).toEqual(
    expect.arrayContaining([
      "src/surface/shop-money-terminal.spec.ts",
      "src/surface/shop-money-neighbors.spec.ts",
      "src/catalogs/fields/money-field.spec.ts",
    ]),
  );
});
