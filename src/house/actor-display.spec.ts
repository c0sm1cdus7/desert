import { expect, it } from "vitest";
import { emptyHouse, houseStep } from "./members.ts";
import { effect, type HouseEmission } from "./facts.ts";
import { actorDisplayName } from "./actor-display.ts";
const fold = (...events: HouseEmission[]) =>
  events.reduce((house, e, i) => houseStep(house, { ...e, id: String(i), at: i, seq: i }), emptyHouse);
const setup = [
  effect("house-created", {}, "franco"),
  effect("granted", { identity: "franco", tools: [] }, "franco"),
  effect("named", { identity: "franco", name: "Franco" }, "franco"),
  effect("assistant-enabled", { owner: "franco", name: "Nora" }, "franco"),
];
it("shows Nora, for Franco before and after disabling or taking out the holder", () => {
  for (const later of [[], [effect("assistant-disabled", { owner: "franco" }, "franco")]])
    expect(actorDisplayName(fold(...setup, ...later), "assistant:franco", "es")).toBe("Nora, por Franco");
  const removed = fold(
    ...setup,
    effect("granted", { identity: "martin", tools: [] }, "franco"),
    effect("handed", { to: "martin" }, "franco"),
    effect("removed", { identity: "franco" }, "martin"),
  );
  expect(actorDisplayName(removed, "assistant:franco", "es")).toBe("Nora, por Franco");
});
it("keeps historical identities and invents no unknown assistants", () => {
  const house = fold(...setup, effect("named", { identity: "nora", name: "Nora vieja" }, "franco"));
  expect(actorDisplayName(house, "nora", "es")).toBe("Nora vieja");
  expect(actorDisplayName(house, "martin", "es")).toBe("martin");
  expect(actorDisplayName(house, "mind:notes", "es")).toBe("mind:notes");
  expect(actorDisplayName(house, "assistant:martin", "es")).toBe("assistant:martin");
});
