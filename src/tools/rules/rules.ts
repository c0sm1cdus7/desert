// Rules belong to the core and share declarations across every surface.
import { rulesTexts as words } from "../../texts/rules.texts.ts";
import type { ProgramTool } from "../promises.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
import { ruleConsult, ruleReading, ruleWriteActions } from "./rule-actions.ts";
import { ruleSimulation } from "./rule-simulation.ts";
const core = new WeakSet<object>();
export const isRulesTool = (tool: object): boolean => core.has(tool);
export function rulesTool<X extends Program>(registry: ToolRegistry<X>): ProgramTool<X> {
  const actions = [...registry];
  const tool: ProgramTool<X> = {
    id: "rules",
    purpose: words.purpose,
    targets: () => [],
    view: state => ruleReading(state),
    summary: state => (state.house.rules.versions.size ? words.history : words.empty),
    acts: { ...ruleWriteActions(actions), consult: ruleConsult<X>(), simulate: ruleSimulation(actions) },
  };
  actions.push(tool);
  core.add(tool);
  return tool;
}
/** The registry with the core's rules tool last; one that already holds it keeps its order, as the house set it. */
export function rulesRegistry<X extends Program>(registry: ToolRegistry<X>): ToolRegistry<X> {
  if (registry.some(tool => tool.id === "rules" && !isRulesTool(tool)))
    throw new Error("rules is reserved for the core");
  return registry.some(tool => tool.id === "rules") ? registry : [...registry, rulesTool(registry)];
}
