import { Type } from "@sinclair/typebox";
import { afterEach, expect, it } from "vitest";
import { baseProjectionVersion, sceneLimits } from "../catalogs/levers.ts";
import { effect, vocabulary, layerOf } from "../journal/events.ts";
import { identityView, visible } from "./house.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { contractRig, type ContractRig } from "../../tests/support/contract-rig.ts";
const rigs: ContractRig[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = () => {
  const rig = contractRig();
  rigs.push(rig);
  return rig;
};

it.each([
  ["scene", { general: "En curso", to: { ana: "Falta revisar" } }],
  ["kit-set", { holder: "beto", tool: "desk", acts: ["say"] }],
])("1: reads %s as a house fact and reserves its name", (kind, data) => {
  const words = vocabulary({});
  expect(layerOf(kind)).toBe("house");
  expect(words.read({ layer: "house", kind, data, by: "ana", cause: [], id: "1", seq: 1, at: 0 })).toMatchObject({
    kind,
    data,
  });
  expect(() => vocabulary({ [kind]: Type.Object({}) })).toThrow();
});

it("8: keeps only each author's last scene, readable by everyone and restored on restart", () => {
  const rig = open();
  for (const by of ["ana", "beto", "mind:desk"])
    expect(rig.act(by, "scene", { general: by, to: { ana: "Revisar", beto: "Leer" } }).status).toBe("accepted");
  expect(rig.act("ana", "scene", { general: "Ahora" }).status).toBe("accepted");
  expect(rig.act("outsider", "scene", { general: "Afuera" })).toMatchObject({ reason: toolTexts.unassigned });
  rig.bus.emit(effect("scene", { general: "Afuera" }, "outsider"));
  const scenes = rig.state().house.scenes;
  expect(scenes.size).toBe(3);
  expect(scenes.get("ana")?.data).toEqual({ general: "Ahora" });
  expect(scenes.get("beto")).toMatchObject({ by: "beto", data: { general: "beto" } });
  expect(scenes.get("ana")?.seq).toBeGreaterThan(scenes.get("beto")?.seq ?? 0);
  for (const by of ["ana", "beto", "mind:desk", "outsider"]) {
    expect(identityView(rig.state(), by).house.scenes).toEqual(scenes);
    expect([...scenes.values()].every(event => visible(rig.state().house, event, by))).toBe(true);
  }
  rig.restart();
  expect(rig.state().house.scenes).toEqual(scenes);
  expect(rig.facts().filter(event => event.kind === "scene" && event.by === "ana")).toHaveLength(2);
});

it("8: rejects excess, blank identity keys and another author's scene before a scene is written", () => {
  const rig = open();
  const invalid = [
    { general: "x".repeat(4001) },
    { general: "" },
    { general: "   " },
    { general: "x", to: { ana: "x".repeat(1001) } },
    { general: "x", to: { "": "x" } },
    { general: "x", to: Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`id${i}`, "x"])) },
    { general: "x", by: "beto" },
    { general: "x", to: { ana: "   " } },
  ];
  for (const input of invalid)
    expect(rig.act("ana", "scene", input)).toMatchObject({ status: "rejected", reason: toolTexts.invalid });
  expect(rig.facts().filter(event => event.kind === "scene")).toHaveLength(0);
  const boundary = {
    general: "x".repeat(sceneLimits.general),
    to: Object.fromEntries(Array.from({ length: sceneLimits.identities }, (_, i) => [`id${i}`, "x".repeat(1000)])),
  };
  expect(rig.act("ana", "scene", boundary).status).toBe("accepted");
  expect(rig.state().house.scenes.get("ana")?.data).toEqual(boundary);
});

it("bumps the base fold version for the new house state", () => {
  expect(baseProjectionVersion).toBe("desert/2");
});
