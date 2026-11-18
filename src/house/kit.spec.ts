import { holderKit } from "./kit-history.ts";
import { afterEach, expect, it } from "vitest";
import { object } from "../fields/visible-text.ts";
import { toolAct } from "../tools/act-definition.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
import type { Shop } from "../../tests/support/shop.ts";
import { allowed, allowedAct } from "./kit.ts";
import { effect } from "./facts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { contractRig, desk, grant, kit, type ContractRig } from "../../tests/support/contract-rig.ts";
const rigs: ContractRig[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = (acts = desk.acts) => {
  const rig = contractRig(acts);
  rigs.push(rig);
  return rig;
};

it("2: gives identities every act by default, then only the admin's kit, across restart", () => {
  const rig = open();
  rig.attend("beto", "desk");
  expect(rig.act("beto", "open", {}, "desk").status).toBe("accepted");
  kit(rig, "beto", ["say"]);
  kit(rig, "beto", null, "desk", "beto");
  expect(rig.act("beto", "open", {}, "desk")).toMatchObject({ reason: toolTexts.outsideKit });
  expect(rig.act("beto", "say", {}, "desk").status).toBe("accepted");
  rig.restart();
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(false);
  kit(rig, "beto", null);
  expect(rig.act("beto", "open", {}, "desk").status).toBe("accepted");
  kit(rig, "beto", []);
  expect(allowed(rig.state().house, "beto", "desk")).toBe(true);
  expect(rig.act("beto", "say", {}, "desk")).toMatchObject({ reason: toolTexts.outsideKit });
  kit(rig, "stranger", null);
  kit(rig, "beto", null, "missing");
  expect(rig.state().house.kits.has("stranger")).toBe(false);
  expect(holderKit(rig.state().house, "beto").selections.some(selection => selection.program === "missing")).toBe(
    false,
  );
});

it("3: removes kits on departure and on tool withdrawal, but preserves a retained tool's kit", () => {
  const rig = open();
  kit(rig, "beto", ["say"]);
  kit(rig, "beto", [], "other");
  grant(rig, "beto", ["desk"]);
  expect(holderKit(rig.state().house, "beto").selections.some(selection => selection.program === "other")).toBe(false);
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(false);
  grant(rig, "beto", []);
  grant(rig, "beto", ["desk"]);
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(true);
  kit(rig, "beto", []);
  rig.bus.emit(effect("removed", { identity: "beto" }, "beto"));
  expect(rig.state().house.selections?.has("beto")).toBe(true);
  rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
  expect(rig.state().house.selections?.has("beto")).toBe(false);
  grant(rig, "beto", ["desk"]);
  rig.restart();
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(true);
});

it("10: never narrows the admin, including after administration changes hands", () => {
  const rig = open();
  kit(rig, "ana", []);
  expect(rig.state().house.kits.has("ana")).toBe(false);
  expect(allowedAct(rig.state().house, "ana", "desk", "open")).toBe(true);
  kit(rig, "beto", []);
  rig.bus.emit(effect("handed", { to: "beto" }, "ana"));
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(true);
  kit(rig, "ana", [], "desk", "beto");
  expect(allowedAct(rig.state().house, "ana", "desk", "open")).toBe(false);
  expect(allowedAct(rig.state().house, "beto", "missing", "open")).toBe(false);
});

it("A4: withdrawing the kit interrupts a running act without writing its result", async () => {
  const nothing = object({});
  let release = () => {};
  const wait = new Promise<void>(resolve => (release = resolve));
  const slow = toolAct<Shop, typeof nothing>(nothing, async () => {
    await wait;
    return { status: "accepted", text: "Lento · Mesa" };
  });
  const rig = open({ ...desk.acts, slow });
  rig.attend("beto", "desk");
  const started = rig.act("beto", "slow", {}, "desk");
  expect(started.status).toBe("processing");
  kit(rig, "beto", []);
  release();
  expect(await settle(started)).toMatchObject({ status: "interrupted", reason: toolTexts.withdrawn, effects: [] });
  expect(rig.facts().filter(e => e.kind === "act-done")).toHaveLength(0);
  expect(rig.state().entries).toEqual([]);
  expect(rig.state().processing.size).toBe(0);
  expect(rig.facts().findLast(e => e.kind === "act-result")?.data).toMatchObject({
    status: "interrupted",
    reason: toolTexts.withdrawn,
  });
});
