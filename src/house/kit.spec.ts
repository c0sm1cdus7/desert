import { afterEach, expect, it } from "vitest";
import { allowed, allowedAct } from "./house.ts";
import { effect } from "../journal/events.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { contractRig, grant, kit, type ContractRig } from "../../tests/support/contract-rig.ts";
const rigs: ContractRig[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = () => {
  const rig = contractRig();
  rigs.push(rig);
  return rig;
};

it("2: gives identities every act by default, then only the admin's kit, across restart", () => {
  const rig = open();
  rig.attend("beto", "desk");
  expect(rig.act("beto", "open", {}, "desk").status).toBe("accepted");
  kit(rig, "beto", ["say"]);
  kit(rig, "beto", null, "desk", "beto");
  expect(rig.act("beto", "open", {}, "desk")).toMatchObject({ reason: toolTexts.unassigned });
  expect(rig.act("beto", "say", {}, "desk").status).toBe("accepted");
  rig.restart();
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(false);
  kit(rig, "beto", null);
  expect(rig.act("beto", "open", {}, "desk").status).toBe("accepted");
  kit(rig, "beto", []);
  expect(allowed(rig.state().house, "beto", "desk")).toBe(true);
  expect(rig.act("beto", "say", {}, "desk")).toMatchObject({ reason: toolTexts.unassigned });
  kit(rig, "stranger", null);
  kit(rig, "beto", null, "missing");
  expect(rig.state().house.kits.has("stranger")).toBe(false);
  expect(rig.state().house.kits.get("beto")?.has("missing")).toBe(false);
});

it("3: removes kits on departure and on tool withdrawal, but preserves a retained tool's kit", () => {
  const rig = open();
  kit(rig, "beto", ["say"]);
  kit(rig, "beto", [], "other");
  grant(rig, "beto", ["desk"]);
  expect(rig.state().house.kits.get("beto")?.has("other")).toBe(false);
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(false);
  grant(rig, "beto", []);
  grant(rig, "beto", ["desk"]);
  expect(allowedAct(rig.state().house, "beto", "desk", "open")).toBe(true);
  kit(rig, "beto", []);
  rig.bus.emit(effect("removed", { identity: "beto" }, "beto"));
  expect(rig.state().house.kits.has("beto")).toBe(true);
  rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
  expect(rig.state().house.kits.has("beto")).toBe(false);
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
