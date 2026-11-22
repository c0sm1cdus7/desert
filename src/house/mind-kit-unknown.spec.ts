import { expect, it } from "vitest";
import { allowedAct } from "./kit.ts";
import { contractRig, kit } from "../../tests/support/contract-rig.ts";
// Negative 23 of the dist-2 sketch: a mind's kit names an action its program does not have.
it("23: a mind kit naming an action its tool lacks grants nothing, is refused, and stays so after reopening", () => {
  const rig = contractRig();
  try {
    kit(rig, "mind:desk", ["missing"]);
    expect(allowedAct(rig.state().house, "mind:desk", "desk", "open")).toBe(false);
    expect(allowedAct(rig.state().house, "mind:desk", "desk", "say")).toBe(false);
    expect(rig.act("mind:desk", "missing", {}, "desk")).toMatchObject({ status: "rejected" });
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
