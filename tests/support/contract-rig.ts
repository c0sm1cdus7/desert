// Two deterministic acts and nested calls, with no provider or external service.
import { object } from "../../src/catalogs/acts.ts";
import { effect } from "../../src/journal/events.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import type { Tool, ToolAct } from "../../src/tools/tool-contract.ts";
import { shopRig } from "./shop-rig.ts";
import { shopRegistry, type Shop } from "./shop.ts";
const nothing = object({});
const say = toolAct<Shop, typeof nothing>(nothing, () => ({ status: "accepted", text: "Dicho · Mesa" }));
const nested = (act: string, target = "desk") =>
  toolAct<Shop, typeof nothing>(
    nothing,
    async (_input, context) => (await context.execute?.({ act, target, input: {} })) ?? { status: "inconclusive" },
  );
export const desk: Tool<Shop> = {
  id: "desk",
  purpose: "A test desk",
  targets: () => ["desk/page"],
  view: () => "",
  summary: () => "",
  acts: { say, open: say, nested: nested("open"), away: nested("say", "other") },
};
export const contractRig = (acts: Readonly<Record<string, ToolAct<Shop>>> = desk.acts) =>
  shopRig({ registry: [...shopRegistry, { ...desk, acts }, { ...desk, id: "other", targets: () => [] }] });
export type ContractRig = ReturnType<typeof contractRig>;
export const kit = (rig: ContractRig, holder: string, acts: string[] | null, tool = "desk", by = "ana") =>
  rig.bus.emit(effect("kit-set", { holder, tool, acts }, by));
export const grant = (rig: ContractRig, identity: string, tools: string[], by = "ana") =>
  rig.bus.emit(effect("granted", { identity, tools }, by));
