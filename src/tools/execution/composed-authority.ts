// An own act cannot take a tool action's place, and each program fact has at most one declared owner.
import { meant } from "../../fields/phrases.ts";
import { Value } from "@sinclair/typebox/value";
import { actionExecution } from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import { layerOf } from "../../house/facts.ts";
import { identityView } from "../../house/members.ts";
import type { OwnAct, Program, State, ToolRegistry } from "../tool-contract.ts";
import { targetTool } from "../../house/attendance.ts";
export function checkOwn<X extends Program>(registry: ToolRegistry<X>, state: State<X>, acts: readonly OwnAct<X>[]) {
  for (const act of acts) {
    const tool = targetTool(registry, state, act.object);
    if (tool && Object.hasOwn(tool.acts, act.option))
      throw new Error(`The own act ${act.option} on ${act.object} hides an action of ${tool.id}`);
  }
}
export function checkComposition<X extends Program>(
  registry: ToolRegistry<X>,
  state: State<X>,
  own?: (state: State<X>) => readonly OwnAct<X>[],
) {
  const owners = new Map<string, string>();
  for (const tool of registry) {
    for (const act of Object.values(tool.acts))
      if (act.execution !== undefined && !Value.Check(actionExecution, act.execution))
        throw new Error(meant(deviceTexts.invalid));
    for (const kind of tool.facts ?? []) {
      if (layerOf(kind) === "house" || owners.has(kind))
        throw new Error(`The fact ${kind} of ${tool.id} already belongs to ${owners.get(kind) ?? "the house"}`);
      owners.set(kind, tool.id);
    }
  }
  for (const by of new Set([state.by, ...state.house.grants.keys()])) {
    const view = identityView(state, by);
    checkOwn(registry, view, own?.(view) ?? []);
  }
}
