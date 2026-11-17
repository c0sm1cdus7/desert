import { expect, it } from "vitest";
import { eligibleMindCards, initialMindAssignment } from "./mind-assignment.ts";
const result = {
  role: "assistant",
  passed: true,
  cases: 3,
  scenes: 9,
  costUsd: 0,
  seconds: 1,
  date: "2026-11-17",
  fingerprint: { cases: "c", skill: "s", frameTexts: "f" },
};
const fingerprint = result.fingerprint;
const cards = [
  {
    name: "expensive",
    version: "1",
    provider: "a",
    capabilities: ["sees"] as const,
    referenceNanoUsd: 10,
    results: [result],
  },
  { name: "cheap", version: "1", provider: "a", capabilities: [] as const, referenceNanoUsd: 5, results: [result] },
];
it("elige la más barata aprobada con llave y filtra capacidades para herramientas", () => {
  expect(initialMindAssignment(cards, "assistant", ["a"], [], fingerprint)?.name).toBe("cheap");
  expect(eligibleMindCards(cards, "assistant", ["a"], ["sees"], fingerprint).map(c => c.name)).toEqual(["expensive"]);
  expect(initialMindAssignment(cards, "assistant", [], [], fingerprint)).toBeUndefined();
  expect(eligibleMindCards(cards, "other", ["a"], [], fingerprint)).toEqual([]);
});
it("descarta evidencia vencida, escenas incompletas y una falla posterior", () => {
  const first = cards[0];
  if (!first) throw new Error("card");
  expect(eligibleMindCards(cards, "assistant", ["a"], [], { ...fingerprint, skill: "otra" })).toEqual([]);
  expect(
    eligibleMindCards(
      [{ ...first, results: [result, { ...result, passed: false }] }],
      "assistant",
      ["a"],
      [],
      fingerprint,
    ),
  ).toEqual([]);
  expect(
    eligibleMindCards([{ ...first, results: [{ ...result, scenes: 8 }] }], "assistant", ["a"], [], fingerprint),
  ).toEqual([]);
});
