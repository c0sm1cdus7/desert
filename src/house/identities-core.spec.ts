import { expect, it } from "vitest";
import { emptyHouse, houseStep, present, allowedAct, type House } from "./house.ts";
import { effect, type HouseEmission } from "../journal/events.ts";

const fold = (events: HouseEmission[]) =>
  events.reduce<House>(
    (house, event, index) => houseStep(house, { ...event, id: String(index), seq: index + 1, at: 0 }),
    { ...emptyHouse, identities: true },
  );

it("reserves the core and keeps removed identities without a kit upon readmission", () => {
  const house = fold([
    effect("house-created", {}, "ana"),
    effect("granted", { identity: "beto", tools: ["desk", "identities"] }, "ana"),
    effect("kit-set", { holder: "beto", tool: "desk", acts: ["say"] }, "ana"),
    effect("removed", { identity: "beto" }, "ana"),
  ]);
  expect(house.removed.has("beto")).toBe(true);
  expect(present([{ id: "identities" }], house, "mind:identities")).toBe(false);
  expect(allowedAct(house, "beto", "identities", "new")).toBe(false);
  const readmitted = houseStep(house, {
    ...effect("granted", { identity: "beto", tools: [] }, "ana"),
    id: "5",
    seq: 5,
    at: 0,
  });
  expect(readmitted.removed.has("beto")).toBe(false);
  expect(readmitted.grants.get("beto")).toEqual([]);
  expect(readmitted.kits.has("beto")).toBe(false);
});
