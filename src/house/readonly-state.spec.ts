import { holderKit } from "./kit-history.ts";
import { member, mutate } from "../../tests/support/state-mutations.ts";
import { afterEach, expect, it } from "vitest";
import { effect } from "./facts.ts";
import { object } from "../fields/visible-text.ts";
import { toolAct } from "../tools/act-definition.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../tests/support/shop.ts";
import type { State } from "../tools/tool-contract.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const attacks = {
  kits: (s: State<Shop>) => mutate(s.house.kits, "set", "mind:desk", new Map([["desk", null]])),
  selections: (s: State<Shop>) =>
    mutate(member(s.house, "selections"), "set", "mind:desk", { version: 2, selections: [] }),
  admin: (s: State<Shop>) => Object.assign(s.house, { admin: "beto" }),
  grants: (s: State<Shop>) => mutate(s.house.grants, "set", "eve", ["desk"]),
  wakeOwners: (s: State<Shop>) => mutate(s.wakeOwners, "set", "other:zero", "mind:desk"),
};
for (const [name, attack] of Object.entries(attacks))
  it(`rev3-estado/camino: startup refuses ${name} and the mind still needs its kit`, async () => {
    const mind = zeroMind();
    const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
    rigs.push(rig);
    expect(await mind.act()).toMatchObject({ status: "rejected", reason: toolTexts.outsideKit });
    expect(() => attack(mind.startup().state())).toThrow(TypeError);
    expect(await mind.act()).toMatchObject({ status: "rejected", reason: toolTexts.outsideKit });
    rig.bus.emit(effect("scene", { general: "otro hecho" }, "ana"));
    expect(rig.state().house.admin).toBe("ana");
    expect(rig.state().house.kits.has("mind:desk")).toBe(false);
    expect(rig.state().house.grants.has("eve")).toBe(false);
    expect(rig.state().wakeOwners.has("other:zero")).toBe(false);
    expect(rig.facts().filter(e => e.kind === "kit-set" || e.kind === "mind-noted")).toEqual([]);
  });
it("rev3-camino: an inner kit, its list and reflected references cannot be changed", () => {
  const mind = zeroMind();
  const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: [] }, "ana"));
  const state = mind.startup().state();
  const kit = state.house.selections?.get("mind:desk");
  if (!kit) throw new Error("Missing test kit");
  expect(() => Object.assign(kit, { version: 1 })).toThrow(TypeError);
  expect(() => mutate(member(kit, "selections"), "push", { kind: "program", program: "desk" })).toThrow(TypeError);
  expect(() => Map.prototype.set.call(state.house.selections, "mind:desk", { version: 2, selections: [] })).toThrow(
    TypeError,
  );
  state.house.selections?.forEach((inner, _key, map) => {
    expect(() => mutate(map, "clear")).toThrow(TypeError);
    expect(() => mutate(inner.selections, "push", { kind: "program", program: "desk" })).toThrow(TypeError);
  });
  const house = member(Object.getOwnPropertyDescriptor(state, "house"), "value");
  expect(() => Object.assign(house, { admin: "beto" })).toThrow(TypeError);
  expect(() => Reflect.setPrototypeOf(state.house, {})).toThrow(TypeError);
  expect(() => Reflect.deleteProperty(state.house, "admin")).toThrow(TypeError);
  expect(holderKit(rig.state().house, "mind:desk").selections).toEqual([]);
});
for (const door of ["view", "act", "reactions", "summary", "surface"] as const)
  it(`${door} refuses every authority mutation`, async () => {
    const seen: string[] = [];
    const check = (state: State<Shop>) => {
      for (const [name, attack] of Object.entries(attacks)) {
        expect(() => attack(state)).toThrow(TypeError);
        seen.push(name);
      }
      return "";
    };
    const empty = object({});
    const mind = zeroMind();
    const tool = {
      ...mind.tool,
      acts: {
        ...mind.tool.acts,
        check: toolAct<Shop, typeof empty>(empty, (_, { state }) => {
          check(state);
          return { status: "accepted" };
        }),
      },
      view: door === "view" ? check : mind.tool.view.bind(mind.tool),
      summary: door === "summary" ? check : mind.tool.summary.bind(mind.tool),
      ...(door === "reactions" ? { reactions: { checked: { when: "boot" as const, act: "check" } } } : {}),
    };
    const rig = shopRig({ registry: [...shopRegistry, tool] });
    rigs.push(rig);
    if (door === "act") {
      rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: ["check"] }, "ana"));
      expect(await mind.act("check")).toEqual({ status: "accepted" });
    } else if (door === "view") tool.view(rig.ports("ana", Date.now).state(), "desk", { recentLines: 20, now: 0 });
    else if (door === "summary") tool.summary(rig.state());
    else if (door === "surface") check(rig.ports("ana", Date.now).state());
    else {
      rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: ["check"] }, "ana"));
      rig.boot();
      await rig.tools().recoverReactions();
    }
    expect(seen).toEqual(expect.arrayContaining(Object.keys(attacks)));
    expect(rig.state().house.admin).toBe("ana");
    expect(await mind.act("write")).toMatchObject({ status: "rejected", reason: toolTexts.outsideKit });
  });
