import { assignMindCard } from "../../tools/minds/mind-settings-actions.ts";
import { explicitKit } from "../kit-selection.ts";
import { afterEach, expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { effect, type HouseEmission } from "../facts.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../../tests/support/shop.ts";
import type { ActContext, Tool } from "../../tools/tool-contract.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const input = object({ acts: Type.Array(Type.String()) });
function open(run: (context: ActContext<Shop>, acts: string[]) => readonly HouseEmission[], certified = false) {
  const action = toolAct<Shop, typeof input>(input, (input, context) => ({
    status: "accepted",
    effects: run(context, input.acts),
  }));
  const core: Tool<Shop> = {
    id: "identities",
    purpose: "Identidades",
    targets: () => ["identities/franco"],
    view: () => "",
    summary: () => "",
    acts: {
      "delegate-assistant": action,
      "assign-mind-card": certified ? assignMindCard<Shop>() : action,
      forge: action,
    },
  };
  const rig = shopRig({
    identities: true,
    registry: [...shopRegistry, core],
    grants: { ana: [], franco: ["sales"], martin: ["sales"] },
  });
  rigs.push(rig);
  rig.bus.emit(effect("assistant-enabled", { owner: "franco", name: "Nora" }, "ana"));
  for (const by of ["ana", "franco", "martin"]) rig.attend(by, "identities");
  return rig;
}
it("Martín y el administrador no delegan a Nora por Franco; Franco sí", async () => {
  const rig = open(({ by }, acts) => [
    effect("assistant-kit-set", { owner: "franco", kit: [{ tool: "sales", acts }] }, by),
  ]);
  for (const by of ["martin", "ana"])
    expect((await settle(rig.act(by, "delegate-assistant", { acts: ["register"] }, "identities/franco"))).status).toBe(
      "rejected",
    );
  expect(rig.state().house.assistants.get("franco")?.kit).toEqual([]);
  expect(
    (await settle(rig.act("franco", "delegate-assistant", { acts: ["register"] }, "identities/franco"))).status,
  ).toBe("accepted");
  expect(rig.state().house.assistants.get("franco")?.selections).toEqual(
    explicitKit([{ tool: "sales", acts: ["register"] }]),
  );
});
it("rechaza actos desconocidos, permisos ausentes y hechos escondidos en otro acto", async () => {
  const rig = open(({ by }, acts) => [
    effect("assistant-kit-set", { owner: "franco", kit: [{ tool: "sales", acts }] }, by),
  ]);
  expect(
    (await settle(rig.act("franco", "delegate-assistant", { acts: ["missing"] }, "identities/franco"))).status,
  ).toBe("rejected");
  rig.bus.emit(effect("granted", { identity: "franco", tools: [] }, "ana"));
  expect(
    (await settle(rig.act("franco", "delegate-assistant", { acts: ["register"] }, "identities/franco"))).status,
  ).toBe("rejected");
  expect((await settle(rig.act("ana", "forge", { acts: [] }, "identities/franco"))).status).toBe("rejected");
  expect(rig.state().house.assistants.get("franco")?.kit).toEqual([]);
});
it("la carta la asigna únicamente el administrador mediante el acto correspondiente", async () => {
  const rig = open(
    ({ by }) => [
      effect("mind-card-assigned", { mind: "assistant:franco", card: "test", version: "v1", capabilities: [] }, by),
    ],
    true,
  );
  rig.bus.emit(
    effect(
      "mind-cards-published",
      { mind: "assistant:franco", cards: [{ card: "test", version: "v1", capabilities: [] }] },
      "ana",
    ),
  );
  expect(
    (await settle(rig.act("franco", "assign-mind-card", { card: JSON.stringify(["test", "v1"]) }, "identities/franco")))
      .status,
  ).toBe("rejected");
  expect((await settle(rig.act("ana", "forge", { acts: [] }, "identities/franco"))).status).toBe("rejected");
  expect(
    (await settle(rig.act("ana", "assign-mind-card", { card: JSON.stringify(["test", "v1"]) }, "identities/franco")))
      .status,
  ).toBe("accepted");
  expect(rig.state().house.mindAssignments.get("assistant:franco")?.card).toBe("test");
});

it("rejects an uncertified action that impersonates card assignment even when called by admin", async () => {
  const rig = open(({ by }) => [
    effect("mind-card-assigned", { mind: "assistant:franco", card: "test", version: "v1", capabilities: [] }, by),
  ]);
  expect((await settle(rig.act("ana", "assign-mind-card", { acts: [] }, "identities/franco"))).status).toBe("rejected");
  expect(rig.state().house.mindAssignments.size).toBe(0);
});
