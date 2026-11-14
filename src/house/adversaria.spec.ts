// Fixed adversarial cases: each observation has an assertion, without providers or external services.
import { afterEach, expect, it } from "vitest";
import { object } from "../catalogs/acts.ts";
import { effect } from "../journal/events.ts";
import { allowedAct, emptyHouse, houseStep } from "./house.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { accepted, ownAct, toolAct } from "../tools/act-definition.ts";
import { settle } from "../surface/bridge/house-ports.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../tests/support/shop.ts";
import { contractRig, desk, grant, kit } from "../../tests/support/contract-rig.ts";
const rigs: { close(): void }[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = (acts = desk.acts) => {
  const rig = contractRig(acts);
  rigs.push(rig);
  return rig;
};
const nothing = object({});

it("A1: only identities receive program own acts; a mind receives its scene", async () => {
  const programOwn = ownAct<Shop, typeof nothing>(
    "me",
    "programa-propio",
    { input: nothing, purpose: "x" },
    (_i, { by }) => accepted(effect("scene", { general: `escrito por ${by}` }, by)),
  );
  const nestedOwn = toolAct<Shop, typeof nothing>(
    nothing,
    async (_input, context) =>
      (await context.execute?.({ act: "programa-propio", input: {} })) ?? { status: "inconclusive" },
  );
  const rig = shopRig({
    registry: [...shopRegistry, { ...desk, acts: { ...desk.acts, nestedOwn } }],
    own: () => [programOwn],
  });
  rigs.push(rig);
  expect(allowedAct(rig.state().house, "mind:desk", "desk", "programa-propio")).toBe(false);
  for (const acts of [undefined, [], null, ["programa-propio"]]) {
    if (acts !== undefined) kit(rig, "mind:desk", acts);
    expect(rig.act("mind:desk", "programa-propio", {})).toMatchObject({
      status: "rejected",
      reason: toolTexts.unknown,
    });
  }
  kit(rig, "mind:desk", ["nestedOwn"]);
  expect(await settle(rig.act("mind:desk", "nestedOwn", {}, "desk"))).toMatchObject({
    status: "rejected",
    reason: toolTexts.unknown,
  });
  expect(rig.state().house.scenes.has("mind:desk")).toBe(false);
  expect(rig.act("mind:desk", "scene", { general: "Mi escena" }).status).toBe("accepted");
  expect(rig.act("beto", "programa-propio", {}).status).toBe("accepted");
});

it("A2: taking administration clears every old kit, also after handing it back and restarting", () => {
  const rig = open();
  kit(rig, "beto", []);
  kit(rig, "beto", [], "other");
  const before = rig.state().house;
  rig.bus.emit(effect("handed", { to: "beto" }, "beto"));
  expect(rig.state().house.kits.get("beto")?.size).toBe(2);
  rig.bus.emit(effect("handed", { to: "beto" }, "ana"));
  expect(rig.state().house.kits.has("beto")).toBe(false);
  expect(before.kits.get("beto")?.size).toBe(2);
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(true);
  rig.restart();
  rig.bus.emit(effect("handed", { to: "ana" }, "beto"));
  rig.restart();
  for (const tool of ["desk", "other"]) expect(allowedAct(rig.state().house, "beto", tool, "open")).toBe(true);
  kit(rig, "beto", []);
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(false);
});

it("A3: unknown acts grant nothing, premature kits are ignored, and the last kit wins", () => {
  const rig = open();
  kit(rig, "beto", ["inexistente"]);
  expect(rig.state().house.kits.get("beto")?.get("desk")).toEqual(["inexistente"]);
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(false);
  grant(rig, "carla", []);
  kit(rig, "carla", ["say"]);
  expect(rig.state().house.kits.has("carla")).toBe(false);
  grant(rig, "carla", ["desk"]);
  expect(allowedAct(rig.state().house, "carla", "desk", "open")).toBe(true);
  kit(rig, "beto", ["say"]);
  kit(rig, "beto", ["open"]);
  expect([
    allowedAct(rig.state().house, "beto", "desk", "say"),
    allowedAct(rig.state().house, "beto", "desk", "open"),
  ]).toEqual([false, true]);
});

it("A4: an already running act finishes after its kit is withdrawn", async () => {
  let release = () => {};
  const wait = new Promise<void>(resolve => (release = resolve));
  const slow = toolAct<Shop, typeof nothing>(nothing, async () => {
    await wait;
    return { status: "accepted", text: "Lento · Mesa" };
  });
  const rig = open({ ...desk.acts, slow });
  rig.attend("beto", "desk");
  const started = rig.act("beto", "slow", {}, "desk");
  kit(rig, "beto", []);
  release();
  expect((await settle(started)).status).toBe("accepted");
  expect(rig.facts().filter(e => e.kind === "act-done")).toHaveLength(1);
});

it("A5: direct facts preserve the documented folding boundary", () => {
  const rig = open();
  rig.bus.emit(effect("scene", { general: "fantasma" }, "mind:nada"));
  rig.bus.emit(effect("kit-set", { holder: "mind:nada", tool: "nada", acts: null }, "ana"));
  kit(rig, "beto", [], "desk", "beto");
  rig.bus.emit(effect("attended", { target: "desk" }, "mind:desk"));
  rig.bus.emit(effect("preferred", { hide: "off", on: true }, "mind:desk"));
  expect(() => rig.bus.emit(effect("scene", { general: "" }, "ana"))).toThrow();
  expect(rig.state().house.scenes.has("mind:nada")).toBe(true);
  expect(rig.state().house.kits.has("mind:nada")).toBe(true);
  expect(rig.state().house.kits.has("beto")).toBe(false);
  expect(rig.state().attendance.get("mind:desk")).toEqual(["desk"]);
  expect(rig.state().house.hides.has("mind:desk")).toBe(false);
});

it.each(["", " ", "\u200b", "k".repeat(200_000), "nadie-que-exista", "mind:desk", "__proto__"])(
  "A6: rejects an invalid scene recipient (case %#) before writing",
  name => {
    const rig = open();
    const result = rig.act("ana", "scene", { general: "x", to: { [name]: "y" } });
    expect(result.status).toBe("rejected");
    expect(result.reason).toBeTruthy();
    expect(rig.facts().filter(e => e.kind === "scene")).toHaveLength(0);
  },
);
it.each(["\t\n", "\u00a0", "\u200b", "\u200c\u200d\u2060\ufeff"])(
  "A6: rejects invisible scene text (case %#)",
  general => {
    const rig = open();
    for (const input of [{ general }, { general: "x", to: { ana: general } }])
      expect(rig.act("ana", "scene", input)).toMatchObject({ status: "rejected", reason: toolTexts.invalid });
    expect(rig.state().house.scenes.size).toBe(0);
  },
);

it("A7: departure keeps the last scene but rejects new writing and forgets the kit", () => {
  const rig = open();
  expect(rig.act("beto", "scene", { general: "antes" }).status).toBe("accepted");
  kit(rig, "beto", ["say"]);
  rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
  expect(rig.act("beto", "scene", { general: "después" }).status).toBe("rejected");
  rig.bus.emit(effect("scene", { general: "a mano" }, "beto"));
  expect(rig.state().house.scenes.get("beto")?.data).toEqual({ general: "antes" });
  expect(rig.state().house.kits.has("beto")).toBe(false);
});

it("A8: a mind's effects cannot grant itself identity privileges or escape its tool", async () => {
  const grantsSelf = toolAct<Shop, typeof nothing>(nothing, (_i, { by }) => ({
    status: "accepted",
    text: "Dado · Mesa",
    effects: [
      effect("granted", { identity: by, tools: ["desk"] }, by),
      effect("handed", { to: by }, by),
      effect("kit-set", { holder: by, tool: "other", acts: null }, by),
      effect("channel-created", { channel: "communicator/x", members: [by] }, by),
    ],
  }));
  const rig = open({ ...desk.acts, grantsSelf });
  kit(rig, "mind:desk", ["grantsSelf", "away"]);
  expect((await settle(rig.act("mind:desk", "grantsSelf", {}, "desk"))).status).toBe("accepted");
  const h = rig.state().house;
  expect(h.grants.has("mind:desk")).toBe(false);
  expect(h.admin).toBe("ana");
  expect(h.kits.get("mind:desk")?.has("other")).toBe(false);
  expect(h.channels.has("communicator/x")).toBe(false);
  expect(await settle(rig.act("mind:desk", "away", {}, "desk"))).toMatchObject({ reason: toolTexts.outsideKit });
});

it("A9: a legacy mind:jefe founder is ignored and the next house-created takes administration", () => {
  const first = { ...effect("house-created", {}, "mind:jefe"), id: "1", seq: 1, at: 0 };
  const ignored = houseStep(emptyHouse, first);
  expect(ignored).toBe(emptyHouse);
  const next = houseStep(ignored, { ...effect("house-created", {}, "ana"), id: "2", seq: 2, at: 0 });
  expect(next.admin).toBe("ana");
  expect([...next.grants.keys()]).toEqual(["ana"]);
  const rig = open();
  grant(rig, "mind:algo", ["desk"]);
  expect(rig.state().house.grants.has("mind:algo")).toBe(false);
  expect(rig.act("mind:algo", "say", {}, "desk").status).toBe("rejected");
  expect(rig.facts().filter(e => e.kind === "granted" && e.data.identity === "mind:algo")).toHaveLength(1);
});

it("A10: direct kit facts retain their existing unbounded action list", () => {
  const rig = open();
  kit(
    rig,
    "beto",
    Array.from({ length: 5000 }, (_, i) => `a${i}`),
  );
  expect(rig.state().house.kits.get("beto")?.get("desk")).toHaveLength(5000);
});
