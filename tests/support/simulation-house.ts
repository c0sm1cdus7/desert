// Builds disposable houses for public rule simulation and normalization regressions.
import { Type } from "@sinclair/typebox";
import type { TSchema } from "@sinclair/typebox";
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
import { startHouse } from "../../src/runtime/house-runtime.ts";
import { vocabulary } from "../../src/journal/vocabulary.ts";
import { settle } from "../../src/surface/bridge/ports/house-ports.ts";
import type { Program, ToolAct } from "../../src/tools/tool-contract.ts";
export const simulationMarker = "SYNTHETIC-SIMULATION-MATERIAL-8427";
export const publicLimit = {
  id: "public-limit",
  text: "Tope de prueba",
  action: { tool: "probe", act: "send" },
  condition: { operator: "gt", field: { source: "input", path: "amount" }, value: 10 },
  effect: "block",
} as const;
export const simulationShapes: readonly TSchema[] = [
  Type.Object({ amount: Type.Number(), token: Type.String({ secret: true }) }),
  Type.Object({
    amount: Type.Number(),
    nested: Type.Object({ token: Type.String({ secret: true }), label: Type.String() }),
  }),
  Type.Union([
    Type.Object({
      kind: Type.Literal("first"),
      amount: Type.Number(),
      nested: Type.Object({ token: Type.String({ secret: true }) }),
    }),
    Type.Object({
      kind: Type.Literal("second"),
      amount: Type.Number(),
      nested: Type.Object({ token: Type.String({ secret: true }), label: Type.String() }),
    }),
  ]),
];
export function simulationHouse(home: string, action: ToolAct<Program>) {
  const options = {
    by: "test",
    projectionVersion: "simulation/1",
    words: vocabulary({}),
    slices: { initial: {}, step: {} },
    registry: [
      { id: "probe", purpose: "Prueba", targets: () => [], view: () => "", summary: () => "", acts: { send: action } },
    ],
    secretKeys: new MemoryHouseKeys(),
    creation: {
      admin: "ana",
      assignments: [
        { identity: "ana", tools: ["probe"] },
        { identity: "beto", tools: ["probe"] },
      ],
    },
  };
  let house = startHouse(home, options);
  const call = (act: string, input: unknown, target = "rules", by = "ana") =>
    settle(house.tools.act({ act, input, target }, house.tools.state().through, by));
  const attend = async () => {
    for (const by of ["ana", "beto"])
      for (const target of ["rules", "probe"]) await call("attend", { target }, "me", by);
  };
  return {
    house: () => house,
    call,
    attend,
    events: () => house.journal.replay<unknown[]>([], (all, event) => [...all, event]),
    reopen: () => {
      house.close();
      house = startHouse(home, options);
    },
    close: () => house.close(),
  };
}
