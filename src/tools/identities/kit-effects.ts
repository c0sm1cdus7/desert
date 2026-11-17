// Lote de granted y kit-set calculado sobre el estado vigente; conserva las otras acciones y herramientas.
import { allowedAct, mindTool } from "../../house/kit.ts";
import type { House } from "../../house/members.ts";
import { effect } from "../../house/facts.ts";
import type { Emission } from "../../journal/vocabulary.ts";
import type { Program, Tool } from "../tool-contract.ts";
// One batch, computed at execution time: another open editor's changes remain in the current kit.
export function kitEffects<X extends Program>(
  house: House,
  by: string,
  holder: string,
  tool: Tool<X>,
  action: string | undefined,
  yes: boolean,
): Emission<X["fact"]>[] {
  const held = house.grants.get(holder) ?? [];
  const actions = Object.keys(tool.acts);
  const effects: Emission<X["fact"]>[] = [];
  if (action === undefined) {
    effects.push(
      effect(
        "granted",
        {
          identity: holder,
          tools: yes ? [...new Set([...held, tool.id])] : held.filter(id => id !== tool.id),
        },
        by,
      ),
    );
    if (yes) effects.push(effect("kit-set", { holder, tool: tool.id, acts: null }, by));
  } else {
    const acts = actions.filter(act => (act === action ? yes : allowedAct(house, holder, tool.id, act)));
    if (mindTool(holder) === undefined && !held.includes(tool.id))
      effects.push(effect("granted", { identity: holder, tools: [...held, tool.id] }, by));
    effects.push(effect("kit-set", { holder, tool: tool.id, acts }, by));
  }
  return effects;
}
