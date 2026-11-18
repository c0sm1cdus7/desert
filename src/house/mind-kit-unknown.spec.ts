import { expect, it } from "vitest";
import { allowedAct } from "./kit.ts";
import { contractRig, kit } from "../../tests/support/contract-rig.ts";
// Negativo 23 del esbozo dist-2: el kit de una mente nombra una acción que su programa no tiene.
it("23: a mind kit naming an action its tool lacks grants nothing, is refused, and stays so after reopening", () => {
  const rig = contractRig();
  try {
    kit(rig, "mind:desk", ["inexistente"]);
    expect(allowedAct(rig.state().house, "mind:desk", "desk", "open")).toBe(false);
    expect(allowedAct(rig.state().house, "mind:desk", "desk", "say")).toBe(false);
    expect(rig.act("mind:desk", "inexistente", {}, "desk")).toMatchObject({ status: "rejected" });
    expect(rig.act("mind:desk", "open", {}, "desk")).toMatchObject({ status: "rejected" });
    rig.restart();
    expect(allowedAct(rig.state().house, "mind:desk", "desk", "open")).toBe(false);
    expect(rig.act("mind:desk", "open", {}, "desk")).toMatchObject({ status: "rejected" });
    kit(rig, "mind:desk", ["open"]);
    expect(allowedAct(rig.state().house, "mind:desk", "desk", "open")).toBe(true);
  } finally {
    rig.close();
  }
});
