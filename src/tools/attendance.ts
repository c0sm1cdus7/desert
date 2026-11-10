import type { Event } from "../journal/events.ts";
import type { Program, State, Tool, ToolRegistry } from "./tool-contract.ts";
export function attendsStep(state: readonly string[], event: Event): readonly string[] {
  if (event.layer !== "house") return state;
  if (event.kind === "unattended") return state.filter(target => target !== event.data.target);
  if (event.kind === "attended" && !state.includes(event.data.target)) return [...state, event.data.target];
  return state;
}
export const targetTool = <X extends Program>(
  registry: ToolRegistry<X>,
  state: State<X>,
  target: string,
): Tool<X> | undefined => registry.find(tool => tool.id === target || tool.targets(state).includes(target));
export const isAttended = (state: Readonly<{ attends: readonly string[] }>, tool: string, target: string): boolean =>
  state.attends.includes(tool) || state.attends.includes(target);
