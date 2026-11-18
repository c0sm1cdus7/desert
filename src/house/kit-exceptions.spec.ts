import { expect, it } from "vitest";
import { contractRig } from "../../tests/support/contract-rig.ts";
import { effect } from "./facts.ts";
import { selectionKit } from "./kit-selection.ts";
import { effectiveKit } from "./kit.ts";
import { kitCatalog } from "../tools/identities/kit-catalog.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
it("H1 keeps scene, attendance and preferences outside program grants", () => {
  const rig = contractRig();
  try {
    rig.bus.emit(effect("kit-set", { version: 2, holder: "mind:desk", kit: selectionKit([]) }, "ana"));
    expect(rig.act("mind:desk", "scene", { general: "Trabajando" }, "me").status).toBe("accepted");
    expect(rig.state().house.scenes.get("mind:desk")?.data.general).toBe("Trabajando");
    for (const [action, target] of [
      ["say", "desk"],
      ["away", "desk"],
      ["say", "other"],
    ])
      expect(rig.act("mind:desk", action ?? "", {}, target).status).toBe("rejected");
    rig.bus.emit(effect("kit-set", { version: 2, holder: "beto", kit: selectionKit([]) }, "ana"));
    expect(rig.act("beto", "attend", { target: "desk" }).status).toBe("accepted");
    expect(rig.act("beto", "prefer", { hide: "off", on: true }).status).toBe("accepted");
    expect(effectiveKit(rig.state().house, "beto", rig.ports("ana", () => 1).registry)).toEqual([]);
    expect(kitCatalog(rig.ports("ana", () => 1).registry).some(program => program.id === "identities")).toBe(false);
  } finally {
    rig.close();
  }
});

it("H1 never lets an allowed program action borrow a nested action from another program", async () => {
  const rig = contractRig();
  try {
    const kit = selectionKit([{ kind: "action", program: "desk", tool: "desk", action: "away" }]);
    rig.bus.emit(effect("kit-set", { version: 2, holder: "mind:desk", kit }, "ana"));
    expect(await settle(rig.act("mind:desk", "away", {}, "desk"))).toMatchObject({ status: "rejected" });
    expect(rig.facts().filter(event => event.kind === "act-done")).toEqual([]);
  } finally {
    rig.close();
  }
});
