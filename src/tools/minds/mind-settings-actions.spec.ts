import { afterEach, expect, it } from "vitest";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../../tests/support/shop.ts";
import { effect } from "../../house/facts.ts";
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
          "assign-mind-card": assignMindCard<Shop>(),
        },
      },
    ],
    grants: { franco: [], ana: [] },
  });
  rigs.push(rig);
  rig.bus.emit(effect("assistant-enabled", { owner: "franco", name: "Nora" }, "ana"));
  rig.bus.emit(
    effect(
      "mind-cards-published",
      { mind: "assistant:franco", cards: [{ card: "c", version: "v1", capabilities: ["sees"] }] },
      "ana",
    ),
  );
  rig.attend("ana", "identities");
  rig.attend("franco", "identities");
  expect(
    (await settle(rig.act("franco", "assign-mind-card", { card: JSON.stringify(["c", "v1"]) }, "identities/franco")))
      .status,
  ).toBe("rejected");
  expect(
    (await settle(rig.act("ana", "assign-mind-card", { card: JSON.stringify(["other", "v1"]) }, "identities/franco")))
      .status,
  ).toBe("rejected");
  expect(
    (await settle(rig.act("ana", "assign-mind-card", { card: JSON.stringify(["c", "v1"]) }, "identities/franco")))
      .status,
  ).toBe("accepted");
  expect(rig.state().house.mindAssignments.get("assistant:franco")?.capabilities).toEqual(["sees"]);
});

it("drops the persisted published cards when the house boots again", () => {
  const rig = shopRig();
  rigs.push(rig);
  rig.bus.emit(
    effect(
      "mind-cards-published",
      { mind: "mind:sales", cards: [{ card: "c", version: "v1", capabilities: [] }] },
      "ana",
    ),
  );
  expect(rig.state().house.mindCards.get("mind:sales")).toHaveLength(1);
  rig.bus.emit(effect("boot", {}, "house"));
  expect(rig.state().house.mindCards.size).toBe(0);
});
