import { afterEach, expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../../tests/support/shop.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { assignMindCard } from "./mind-settings-actions.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
it("solo administración asigna una carta elegible al asistente en Identidades", async () => {
  const rig = shopRig({
    identities: true,
    registry: [
      ...shopRegistry,
      {
        id: "identities",
        purpose: "Identidades",
        targets: () => ["identities/franco"],
        view: () => "",
        summary: () => "",
        acts: {
          "assign-mind-card": assignMindCard<Shop>([{ name: "c", version: "v1", capabilities: ["sees"] }], "es"),
        },
      },
    ],
    grants: { franco: [], ana: [] },
  });
  rigs.push(rig);
  rig.bus.emit(effect("assistant-enabled", { owner: "franco", name: "Nora" }, "ana"));
  rig.attend("ana", "identities");
  rig.attend("franco", "identities");
  expect(
    (await settle(rig.act("franco", "assign-mind-card", { card: "c", version: "v1" }, "identities/franco"))).status,
  ).toBe("rejected");
  expect(
    (await settle(rig.act("ana", "assign-mind-card", { card: "other", version: "v1" }, "identities/franco"))).status,
  ).toBe("rejected");
  expect(
    (await settle(rig.act("ana", "assign-mind-card", { card: "c", version: "v1" }, "identities/franco"))).status,
  ).toBe("accepted");
  expect(rig.state().house.mindAssignments.get("assistant:franco")?.capabilities).toEqual(["sees"]);
});
