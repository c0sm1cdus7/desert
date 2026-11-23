import { stateResult } from "../journal/readonly-state.ts";
import "../../tests/support/upgrade-vault.ts";
import { afterEach, expect, it } from "vitest";
import { object } from "../fields/visible-text.ts";
import { effect, type HouseEmission, type HouseEvent } from "./facts.ts";
import { frozenState } from "../journal/frozen-state.ts";
import { houseStep, emptyHouse } from "./members.ts";
import { allowedAct, present } from "./kit.ts";
import { toolAct } from "../tools/act-definition.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
import { contractRig, desk, kit, type ContractRig } from "../../tests/support/contract-rig.ts";
import { home, open, legacy, matches } from "../../tests/support/upgrade-support.ts";
import { shopProgram, type Shop } from "../../tests/support/shop.ts";
const rigs: ContractRig[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const positioned = (fact: HouseEmission): HouseEvent => ({ ...fact, id: "fact", seq: 1, at: 0 });

it("does not let identity-only facts admit a mind, even from an old manually supplied state", () => {
  const mind = "mind:desk";
  const old = {
    ...emptyHouse,
    admin: "ana",
    grants: new Map([
      ["ana", []],
      [mind, ["desk"]],
    ]),
  };
  expect(houseStep(emptyHouse, positioned(effect("house-created", {}, mind)))).toBe(emptyHouse);
  expect(houseStep(old, positioned(effect("handed", { to: mind }, "ana")))).toBe(old);
  expect(present([{ id: "other" }], old, mind)).toBe(false);
});

it("folds kits and scenes without mutating previous states, including removal and replacement", () => {
  const rig = contractRig();
  rigs.push(rig);
  let state = stateResult(rig.state().house);
  const facts = [
    effect("kit-set", { holder: "beto", tool: "desk", acts: ["say"] }, "ana"),
    effect("scene", { general: "Antes" }, "beto"),
    effect("scene", { general: "Después" }, "beto"),
    effect("granted", { identity: "beto", tools: ["other"] }, "ana"),
    effect("kit-set", { holder: "beto", tool: "other", acts: null }, "ana"),
    effect("removed", { identity: "beto" }, "ana"),
  ];
  for (const fact of facts) {
    const before = structuredClone(state);
    const previous = frozenState(structuredClone(state));
    state = houseStep(previous, positioned(fact));
    expect(previous).toEqual(before);
  }
  expect(state.kits.has("beto")).toBe(false);
  expect(state.scenes.get("beto")?.data.general).toBe("Después");
});

it("checks a changed kit again when an in-flight mind later starts a nested act", async () => {
  let release = () => {};
  const wait = new Promise<void>(resolve => {
    release = resolve;
  });
  const nothing = object({});
  const delayed = toolAct<Shop, typeof nothing>(nothing, async (_input, context) => {
    await wait;
    return (await context.execute?.({ act: "open", target: "desk", input: {} })) ?? { status: "inconclusive" };
  });
  const rig = contractRig({ ...desk.acts, delayed });
  rigs.push(rig);
  kit(rig, "mind:desk", ["delayed", "open"]);
  const started = rig.act("mind:desk", "delayed", {}, "desk");
  expect(started.status).toBe("processing");
  kit(rig, "mind:desk", ["delayed"]);
  release();
  expect(await settle(started)).toMatchObject({
    status: "rejected",
    reason: { en: "outside the kit", es: "fuera del kit" },
  });
  expect(rig.facts().filter(event => event.kind === "act-done")).toHaveLength(0);
});

it("reopens a legacy journal unchanged, then saves and restores kits and the latest scenes", () => {
  const path = home();
  legacy(path);
  let house = open(path);
  try {
    expect(house.tools.state().house.kits.size).toBe(0);
    expect(house.tools.state().house.scenes.size).toBe(0);
    expect(allowedAct(house.tools.state().house, "ana", "sales", "register")).toBe(true);
    house.bus.emit(effect("granted", { identity: "beto", tools: ["sales"] }, "ana"));
    house.bus.emit(effect("language-set", { identity: "beto", language: "es" }, "ana"));
    house.bus.emit(effect("kit-set", { holder: "beto", tool: "sales", acts: [] }, "ana"));
    expect(house.tools.act({ act: "scene", input: { general: "Vigente" } }, 0, "beto").status).toBe("accepted");
    const kept = house.tools.state().house;
    house.close();
    house = open(path);
    expect(house.tools.state().house).toEqual(kept);
    matches(house, shopProgram);
  } finally {
    house.close();
  }
});

it("interrupts a mind across a restart without repeating its in-flight action", async () => {
  let release = () => {};
  const wait = new Promise<void>(resolve => {
    release = resolve;
  });
  let runs = 0;
  const nothing = object({});
  const delayed = toolAct<Shop, typeof nothing>(nothing, async () => {
    runs++;
    await wait;
    return { status: "accepted", text: "Terminado · Mesa" };
  });
  const rig = contractRig({ delayed });
  rigs.push(rig);
  kit(rig, "mind:desk", ["delayed"]);
  const started = rig.act("mind:desk", "delayed", {}, "desk");
  expect(started.status).toBe("processing");
  rig.restart();
  rig.boot();
  release();
  expect(await settle(started)).toMatchObject({
    status: "interrupted",
    reason: { en: "action interrupted", es: "acción interrumpida" },
    effects: [],
  });
  expect(runs).toBe(1);
  expect(rig.state().processing.size).toBe(0);
  expect(rig.facts().findLast(event => event.kind === "act-result")).toMatchObject({
    by: "mind:desk",
    data: { status: "interrupted" },
  });
  expect(rig.facts().filter(event => event.kind === "act-done")).toHaveLength(0);
});
