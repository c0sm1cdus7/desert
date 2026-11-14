import { afterEach, expect, it } from "vitest";
import { mindOf, mindTool, houseChannel, channelFor, allowedAct } from "./house.ts";
import { effect } from "../journal/events.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { settle } from "../surface/bridge/house-ports.ts";
import { contractRig, grant, kit, type ContractRig } from "../../tests/support/contract-rig.ts";
const rigs: ContractRig[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = () => {
  const rig = contractRig();
  rigs.push(rig);
  return rig;
};
const mind = "mind:desk";

it("4: a tool mind acts and writes under its own name, only with a kit, without attending", () => {
  const rig = open();
  expect(mindOf("desk")).toBe(mind);
  expect([mindTool(mind), mindTool("ana"), mindTool("mind:")]).toEqual(["desk", undefined, undefined]);
  expect(rig.act(mind, "say", {}, "desk")).toMatchObject({ reason: toolTexts.unassigned });
  kit(rig, mind, ["say"]);
  expect(rig.act(mind, "say", {}, "desk").status).toBe("accepted");
  expect(rig.act(mind, "open", {}, "desk")).toMatchObject({ reason: toolTexts.unassigned });
  expect(rig.facts().findLast(event => event.kind === "act-done")).toMatchObject({ by: mind });
  expect(rig.state().entries.at(-1)).toMatchObject({ by: mind, data: { author: mind } });
  expect(
    rig
      .facts()
      .filter(event => event.kind === "stimulus")
      .map(event => event.by),
  ).toEqual(["ana", "beto"]);
  expect(rig.state().attendance.has(mind)).toBe(false);
  kit(rig, mind, null);
  rig.restart();
  expect(rig.act(mind, "open", {}, "desk/page").status).toBe("accepted");
  kit(rig, mind, []);
  expect(rig.act(mind, "say", {}, "desk")).toMatchObject({ reason: toolTexts.unassigned });
});

it("5: a mind's nested acts inherit its own tool and narrowed kit", async () => {
  const rig = open();
  kit(rig, mind, ["nested", "away"]);
  kit(rig, mind, null, "other");
  expect(rig.state().house.kits.get(mind)?.has("other")).toBe(false);
  expect(rig.act(mind, "say", {}, "other")).toMatchObject({ reason: toolTexts.unassigned });
  for (const act of ["nested", "away"])
    expect(await settle(rig.act(mind, act, {}, "desk"))).toMatchObject({ reason: toolTexts.unassigned });
  kit(rig, mind, ["nested", "open"]);
  expect((await settle(rig.act(mind, "nested", {}, "desk"))).status).toBe("accepted");
  expect(
    rig
      .facts()
      .filter(event => event.kind === "act")
      .every(event => event.by === mind),
  ).toBe(true);
});

it("6: a mind never joins grants, channels or administration; an unknown mind cannot act", () => {
  const rig = open();
  grant(rig, mind, ["desk"]);
  expect(rig.state().house.grants.has(mind)).toBe(false);
  expect(rig.state().house.channels.get(houseChannel)).not.toContain(mind);
  rig.bus.emit(effect("handed", { to: mind }, "ana"));
  expect(rig.state().house.admin).toBe("ana");
  expect(channelFor(rig.state().house, "ana", ["ana", mind])).toBeUndefined();
  rig.bus.emit(effect("channel-created", { channel: "communicator/invalid", members: ["ana", mind] }, "ana"));
  expect(rig.state().house.channels.size).toBe(1);
  kit(rig, "mind:missing", null, "missing");
  expect(rig.act("mind:missing", "scene", { general: "Nada" })).toMatchObject({ reason: toolTexts.unassigned });
  expect(rig.act("mind:missing", "say", {}, "desk")).toMatchObject({ reason: toolTexts.unassigned });
});

it.each(["prefer", "attend", "unattend"])("7: a mind is not offered %s", act => {
  const rig = open();
  const input = act === "prefer" ? { hide: "off", on: true } : { target: "desk" };
  expect(rig.act(mind, act, input)).toMatchObject({ status: "rejected", reason: toolTexts.unknown });
  expect(rig.state().house.hides.has(mind)).toBe(false);
  expect(rig.state().attendance.has(mind)).toBe(false);
});

it("5: rejects a foreign tool even when a manually supplied house gives its kit to a mind", () => {
  const rig = open();
  const house = {
    ...rig.state().house,
    kits: new Map([
      [
        mind,
        new Map<string, string[] | null>([
          ["desk", ["say"]],
          ["other", null],
        ]),
      ],
    ]),
  };
  expect(allowedAct(house, mind, "desk", "say")).toBe(true);
  expect(allowedAct(house, mind, "other", "say")).toBe(false);
  const admin = { ...house, admin: "ana", kits: new Map([["ana", new Map([["desk", []]])]]) };
  expect(allowedAct(admin, "ana", "desk", "say")).toBe(true);
});
