import type { Event } from "../journal/events.ts";
import type { Program, State, Tool, ToolRegistry } from "./tool-contract.ts";
export function attendsStep(state: readonly string[], event: Event): readonly string[] {
  if (event.layer !== "house") return state;
  if (event.kind === "unattended") return state.filter(target => target !== event.data.target);
  if (event.kind === "attended" && !state.includes(event.data.target)) return [...state, event.data.target];
  return state;
}
type Looked = ReadonlyMap<string, ReadonlyMap<string, number>>;
/** Having something in front is dated: a person's own attending, never a process's. */
export function lookedStep(state: Looked, event: Event): Looked {
  if (event.layer !== "house" || event.kind !== "attended" || event.process) return state;
  return new Map(state).set(event.by, new Map(state.get(event.by)).set(event.data.target, event.seq));
}
export const targetTool = <X extends Program>(
  registry: ToolRegistry<X>,
  state: State<X>,
  target: string,
): Tool<X> | undefined => registry.find(tool => tool.id === target || tool.targets(state).includes(target));
export const isAttended = (state: Readonly<{ attends: readonly string[] }>, tool: string, target: string): boolean =>
  state.attends.includes(tool) || state.attends.includes(target);
