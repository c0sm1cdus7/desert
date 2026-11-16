// An own act cannot take a tool action's place, and each program fact has at most one declared owner.
import { layerOf } from "../../house/facts.ts";
import { identityView } from "../../house/members.ts";
import type { OwnAct, Program, State, ToolRegistry } from "../tool-contract.ts";
import { targetTool } from "../../house/attendance.ts";
export function checkOwn<X extends Program>(registry: ToolRegistry<X>, state: State<X>, acts: readonly OwnAct<X>[]) {
  for (const act of acts) {
    const tool = targetTool(registry, state, act.object);
    if (tool && Object.hasOwn(tool.acts, act.option))
      throw new Error(`El acto propio ${act.option} sobre ${act.object} tapa una acción de ${tool.id}`);
  }
}
export function checkComposition<X extends Program>(
  registry: ToolRegistry<X>,
  state: State<X>,
  own?: (state: State<X>) => readonly OwnAct<X>[],
) {
  const owners = new Map<string, string>();
  for (const tool of registry) {
    for (const kind of tool.facts ?? []) {
      if (layerOf(kind) === "house" || owners.has(kind))
        throw new Error(`El hecho ${kind} de ${tool.id} ya pertenece a ${owners.get(kind) ?? "la casa"}`);
      owners.set(kind, tool.id);
    }
  }
  for (const by of new Set([state.by, ...state.house.grants.keys()])) {
    const view = identityView(state, by);
    checkOwn(registry, view, own?.(view) ?? []);
  }
}
