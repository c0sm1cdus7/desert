// Las reglas sólo cambian por las acciones del core y se revisan antes de publicar hechos demorados.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../../tests/support/shop.ts";
import { toolAct } from "../act-definition.ts";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { rulesTool } from "./rules.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
const definition = {
  id: "limit",
  text: "Pausa de ventas",
  action: { tool: "sales", act: "register" },
  condition: { operator: "actor", kind: "identity" },
  effect: "frena",
} as const;
const forged: readonly HouseEmission[] = [
  effect("rule-versioned", { definition, version: 1, previous: null }, "ana"),
  effect("rule-approved", { id: "limit", version: 1 }, "ana"),
  effect("rule-retired", { id: "limit", version: 1 }, "ana"),
  effect("rule-evaluated", { action: definition.action, results: [] }, "ana"),
];
it.each(forged)("un programa no puede falsificar $kind, aunque actúe el admin", async fact => {
  const rig = shopRig({
    registry: [
      ...shopRegistry,
      {
        id: "impostor",
        purpose: "Prueba",
        targets: () => [],
        view: () => "",
        summary: () => "",
        acts: {
          forge: toolAct<Shop, ReturnType<typeof Type.Object>>(Type.Object({}), () => ({
            status: "accepted",
            effects: [fact],
          })),
        },
      },
    ],
  });
  try {
    rig.attend("ana", "impostor");
    const result = await settle(rig.act("ana", "forge", {}, "impostor"));
    expect(result.status).toBe("rejected");
    expect(rig.state().house.rules.versions.size).toBe(0);
    expect(rig.journal.replay<boolean>(false, (found, event) => found || event.kind === fact.kind)).toBe(false);
  } finally {
    rig.close();
  }
});
it("una regla guardada durante una espera impide publicar los hechos del acto", async () => {
  let release = () => {};
  const registry = [
    ...shopRegistry,
    {
      id: "delayed",
      purpose: "Prueba",
      targets: () => [],
      view: () => "",
      summary: () => "",
      acts: {
        write: toolAct<Shop, ReturnType<typeof Type.Object>>(Type.Object({}), async (_, { by }) => {
          await new Promise<void>(resolve => {
            release = resolve;
          });
          return {
            status: "accepted",
            effects: [
              effect(
                "tool-entry",
                {
                  tool: "delayed",
                  target: "delayed",
                  author: by,
                  text: "No publicar",
                },
                by,
              ),
            ],
          };
        }),
      },
    },
  ];
  const rig = shopRig({ registry: [...registry, rulesTool(registry)] });
  try {
    for (const tool of ["delayed", "rules"]) rig.attend("ana", tool);
    const pending = settle(rig.act("ana", "write", {}, "delayed"));
    expect(
      (
        await settle(
          rig.act(
            "ana",
            "save",
            {
              ...definition,
              action: { tool: "delayed", act: "write" },
            },
            "rules",
          ),
        )
      ).status,
    ).toBe("accepted");
    release();
    expect((await pending).status).toBe("rejected");
    expect(rig.state().entries.some(entry => entry.data.text === "No publicar")).toBe(false);
  } finally {
    rig.close();
  }
});
