import { expect, it } from "vitest";
import { eligibleMindCards } from "./mind-assignment.ts";
const failed = {
  role: "assistant",
  passed: false,
  cases: 3,
  scenes: 9,
  fingerprint: { cases: "c", skill: "s", frameTexts: "f" },
};
const cards = [
  {
    name: "expensive",
    version: "1",
    provider: "a",
    capabilities: ["sees"] as const,
    referenceNanoUsd: 10,
    results: [],
  },
  { name: "cheap", version: "1", provider: "a", capabilities: [] as const, referenceNanoUsd: 5, results: [failed] },
];
it("offers every card of an enabled provider with the needed capabilities, whatever the bank said", () => {
  expect(eligibleMindCards(cards, ["a"], []).map(card => card.name)).toEqual(["expensive", "cheap"]);
  expect(eligibleMindCards(cards, ["a"], ["sees"]).map(card => card.name)).toEqual(["expensive"]);
  expect(eligibleMindCards(cards, ["b"], [])).toEqual([]);
});
it("drops cards without a valid reference price", () => {
  const first = cards[0];
  if (!first) throw new Error("card");
  for (const referenceNanoUsd of [-1, 1.5, Number.NaN])
    expect(eligibleMindCards([{ ...first, referenceNanoUsd }], ["a"], [])).toEqual([]);
});
