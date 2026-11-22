// Fixed adversarial cases: each observation has an assertion, without providers or external services.
import { afterEach, expect, it } from "vitest";
import { object } from "../fields/visible-text.ts";
import { effect, type HouseEvent, type HouseEmission } from "./facts.ts";
import { holderKit } from "./kit-history.ts";
import { allowedAct } from "./kit.ts";
import { emptyHouse, houseStep } from "./members.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { accepted, ownAct, toolAct } from "../tools/act-definition.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
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
  const programOwn = ownAct<Shop, typeof nothing>("me", "own-program", { input: nothing, purpose: "x" }, (_i, { by }) =>
    accepted(effect("scene", { general: `escrito por ${by}` }, by)),
  );
  const nestedOwn = toolAct<Shop, typeof nothing>(
    nothing,
    async (_input, context) =>
      (await context.execute?.({ act: "own-program", input: {} })) ?? { status: "inconclusive" },
  );
  const rig = shopRig({
    registry: [...shopRegistry, { ...desk, acts: { ...desk.acts, nestedOwn } }],
    own: () => [programOwn],
  });
  rigs.push(rig);
  expect(allowedAct(rig.state().house, "mind:desk", "desk", "own-program")).toBe(false);
  for (const acts of [undefined, [], null, ["own-program"]]) {
    if (acts !== undefined) kit(rig, "mind:desk", acts);
    expect(rig.act("mind:desk", "own-program", {})).toMatchObject({
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
  expect(rig.act("beto", "own-program", {})).toMatchObject({ status: "rejected", effects: [] });
  expect(rig.state().house.scenes.has("beto")).toBe(false);
});

it("A2: taking administration clears every historical kit, also after handing it back and replaying", () => {
  const events: HouseEvent[] = [];
  let house = emptyHouse;
  const append = (event: HouseEmission) => {
    const fact = { ...event, id: String(events.length), seq: events.length + 1, at: events.length };
    events.push(fact);
    house = houseStep(house, fact);
  };
  append(effect("house-created", {}, "ana"));
  for (const identity of ["ana", "beto"]) append(effect("granted", { identity, tools: ["desk", "other"] }, "ana"));
  for (const tool of ["desk", "other"]) append(effect("kit-set", { holder: "beto", tool, acts: [] }, "ana"));
  const before = house;
  append(effect("handed", { to: "beto" }, "beto"));
  expect(house.kits.get("beto")?.size).toBe(2);
  append(effect("handed", { to: "beto" }, "ana"));
  expect(house.kits.has("beto")).toBe(false);
  expect(before.kits.get("beto")?.size).toBe(2);
  expect(allowedAct(house, "beto", "desk", "open")).toBe(true);
  expect(events.reduce(houseStep, emptyHouse)).toEqual(house);
  append(effect("handed", { to: "ana" }, "beto"));
  house = events.reduce(houseStep, emptyHouse);
  for (const tool of ["desk", "other"]) expect(allowedAct(house, "beto", tool, "open")).toBe(true);
  append(effect("kit-set", { holder: "beto", tool: "desk", acts: [] }, "ana"));
  expect(allowedAct(house, "beto", "desk", "open")).toBe(false);
});

it("A3: unknown acts grant nothing, premature kits are ignored, and the last kit wins", () => {
  const rig = open();
  kit(rig, "beto", ["missing"]);
  expect(holderKit(rig.state().house, "beto").selections).toContainEqual({
    kind: "action",
    program: "desk",
    tool: "desk",
    action: "missing",
  });
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

it("A5: direct facts preserve the documented folding boundary", () => {
  const rig = open();
  rig.bus.emit(effect("scene", { general: "ghost" }, "mind:nothing"));
  rig.bus.emit(effect("kit-set", { holder: "mind:nothing", tool: "nothing", acts: null }, "ana"));
  kit(rig, "beto", [], "desk", "beto");
  rig.bus.emit(effect("attended", { target: "desk" }, "mind:desk"));
  rig.bus.emit(effect("preferred", { hide: "off", on: true }, "mind:desk"));
  expect(() => rig.bus.emit(effect("scene", { general: "" }, "ana"))).toThrow();
  expect(rig.state().house.scenes.has("mind:nothing")).toBe(true);
  expect(holderKit(rig.state().house, "mind:nothing").selections).toEqual([
    { kind: "tool", program: "nothing", tool: "nothing" },
  ]);
  expect(rig.state().house.kits.has("beto")).toBe(false);
  expect(rig.state().attendance.get("mind:desk")).toEqual(["desk"]);
  expect(rig.state().house.hides.has("mind:desk")).toBe(false);
});

it.each(["", " ", "\u200b", "k".repeat(200_000), "nobody-who-exists", "mind:desk", "__proto__"])(
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
    ],
  }));
  const rig = open({ ...desk.acts, grantsSelf });
  kit(rig, "mind:desk", ["grantsSelf", "away"]);
  const before = rig.facts().length;
  expect(await settle(rig.act("mind:desk", "grantsSelf", {}, "desk"))).toMatchObject({
    status: "rejected",
    effects: [],
  });
  expect(
    rig
      .facts()
      .slice(before)
      .some(e => ["granted", "handed", "kit-set"].includes(e.kind)),
  ).toBe(false);
  const h = rig.state().house;
  expect(h.grants.has("mind:desk")).toBe(false);
  expect(h.admin).toBe("ana");
  expect(holderKit(h, "mind:desk").selections.some(selection => selection.program === "other")).toBe(false);
  expect(await settle(rig.act("mind:desk", "away", {}, "desk"))).toMatchObject({ reason: toolTexts.outsideKit });
});

it("A9: a legacy mind:boss founder is ignored and the next house-created takes administration", () => {
  const first = { ...effect("house-created", {}, "mind:boss"), id: "1", seq: 1, at: 0 };
  const ignored = houseStep(emptyHouse, first);
  expect(ignored).toBe(emptyHouse);
  const next = houseStep(ignored, { ...effect("house-created", {}, "ana"), id: "2", seq: 2, at: 0 });
  expect(next.admin).toBe("ana");
  expect([...next.grants.keys()]).toEqual(["ana"]);
  const rig = open();
  grant(rig, "mind:something", ["desk"]);
  expect(rig.state().house.grants.has("mind:something")).toBe(false);
  expect(rig.act("mind:something", "say", {}, "desk").status).toBe("rejected");
  expect(rig.facts().filter(e => e.kind === "granted" && e.data.identity === "mind:something")).toHaveLength(1);
});

it("A10: direct kit facts retain their existing unbounded action list", () => {
  const rig = open();
  kit(
    rig,
    "beto",
    Array.from({ length: 5000 }, (_, i) => `a${i}`),
  );
  expect(
    holderKit(rig.state().house, "beto").selections.filter(selection => selection.program === "desk"),
  ).toHaveLength(5000);
});
