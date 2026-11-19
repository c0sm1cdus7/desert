import { houseActs } from "../house/scenes.ts";
import { noCapabilities } from "../tools/execution/execution-capabilities.ts";
import { Value } from "@sinclair/typebox/value";
import { scene, sceneLimits } from "../house/own-acts.ts";
import { Type } from "@sinclair/typebox";
import { afterEach, expect, it } from "vitest";
import { baseProjectionVersion } from "../runtime/projection-version.ts";

import { effect, layerOf } from "../house/facts.ts";
import { vocabulary } from "./vocabulary.ts";
import { identityView } from "../house/members.ts";
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
  for (let i = 0; i < sceneLimits.identities; i++)
    rig.bus.emit(effect("granted", { identity: `id${i}`, tools: [] }, "ana"));
  const boundary = {
    general: "x".repeat(sceneLimits.general),
    to: Object.fromEntries(Array.from({ length: sceneLimits.identities }, (_, i) => [`id${i}`, "x".repeat(1000)])),
  };
  expect(rig.act("ana", "scene", boundary).status).toBe("accepted");
  expect(rig.state().house.scenes.get("ana")?.data).toEqual(boundary);
});

it("bumps the base fold version for English core values, credentials, selections, names and wake ownership", () => {
  expect(baseProjectionVersion).toBe("desert/12");
});

it("A6: the scene schema bounds recipient names independently of current membership", () => {
  for (const name of ["", " ", "\u200b", "k".repeat(161), "k".repeat(160) + "\n"])
    expect(Value.Check(scene, { general: "x", to: { [name]: "y" } })).toBe(false);
  expect(Value.Check(scene, { general: "x", to: { ["k".repeat(160)]: "y" } })).toBe(true);
  expect(Value.Check(scene, { general: "x", to: { ["k".repeat(159) + "\n"]: "y" } })).toBe(true);
});

it("A6: recipients must still belong, and rejection leaves the previous scene whole", () => {
  const rig = open();
  const name = "k".repeat(160);
  rig.bus.emit(effect("granted", { identity: name, tools: [] }, "ana"));
  const input = { general: "Antes", to: { [name]: "Para quien está", ana: "Para quien administra" } };
  expect(rig.act("mind:desk", "scene", input).status).toBe("accepted");
  const previous = rig.state().house.scenes.get("mind:desk");
  rig.bus.emit(effect("removed", { identity: name }, "ana"));
  rig.restart();
  const result = rig.act("mind:desk", "scene", input);
  expect(result.status).toBe("rejected");
  expect(result.reason).toContain(name);
  expect(rig.state().house.scenes.get("mind:desk")).toEqual(previous);
  rig.bus.emit(effect("granted", { identity: name, tools: [] }, "ana"));
  expect(rig.act("mind:desk", "scene", input).status).toBe("accepted");
});

it("A6: a manually supplied mind grant is still not a scene recipient", () => {
  const rig = open();
  const state = rig.state();
  const house = { ...state.house, grants: new Map(state.house.grants).set("mind:desk", ["desk"]) };
  const own = houseActs([])("ana").find(act => act.option === "scene");
  expect(
    own?.run(
      { general: "x", to: { "mind:desk": "y" } },
      {
        by: "ana",
        state: { ...state, house },
        through: 0,
        target: "me",
        at: 0,
        ...noCapabilities,
      },
    ),
  ).toMatchObject({ status: "rejected", reason: toolTexts.sceneRecipient("mind:desk") });
});
