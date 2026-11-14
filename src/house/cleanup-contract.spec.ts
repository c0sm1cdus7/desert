import { expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { scene } from "../catalogs/acts.ts";
import { houseStep } from "./house.ts";
import { effect } from "../journal/events.ts";
import { contractRig, kit } from "../../tests/support/contract-rig.ts";

it("preserves both other kits when administration passes, even after reopening", () => {
  const rig = contractRig();
  try {
    rig.bus.emit(effect("granted", { identity: "carla", tools: ["desk"] }, "ana"));
    kit(rig, "beto", ["say"]);
    kit(rig, "carla", []);
    const before = rig.state().house;
    const kits = new Map(before.kits).set("ana", new Map([["desk", ["say"]]]));
    const folded = houseStep(
      { ...before, kits },
      { ...effect("handed", { to: "beto" }, "ana"), seq: 1, id: "1", at: 0 },
    );
    expect([...folded.kits.keys()].sort()).toEqual(["ana", "carla"]);
    expect(folded.kits.get("ana")).toEqual(kits.get("ana"));
    expect(folded.kits.get("carla")).toEqual(kits.get("carla"));
    rig.bus.emit(effect("handed", { to: "beto" }, "ana"));
    kit(rig, "ana", [], "desk", "beto");
    expect(rig.state().house.kits.get("carla")?.get("desk")).toEqual([]);
    rig.bus.emit(effect("handed", { to: "carla" }, "beto"));
    for (const check of [() => {}, () => rig.restart()]) {
      check();
      expect(rig.state().house.kits.has("carla")).toBe(false);
      expect(rig.state().house.kits.get("ana")?.get("desk")).toEqual([]);
    }
  } finally {
    rig.close();
  }
});

it.each([
  "\u00ad",
  "\u2063",
  "\u3164",
  "\u2800",
  "\u115f",
  "\u1160",
  "\uffa0",
  " ",
  "\n",
  "\u200b",
  "\u200d",
  "\u2060",
  "\ufeff",
  "\u{e0100}",
])("rejects invisible %j in every scene position", char => {
  for (const input of [{ general: char }, { general: "x", to: { ana: char } }, { general: "x", to: { [char]: "x" } }])
    expect(Value.Check(scene, input)).toBe(false);
  expect(Value.Check(scene, { general: `a${char}b`, to: { [`a${char}b`]: `a${char}b` } })).toBe(true);
});
it("counts recipient names in UTF-16 units", () => {
  expect(Value.Check(scene, { general: "x", to: { ["😀".repeat(80)]: "y" } })).toBe(true);
  expect(Value.Check(scene, { general: "x", to: { ["😀".repeat(81)]: "y" } })).toBe(false);
});
