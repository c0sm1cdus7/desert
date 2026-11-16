import { ids } from "./ids.ts";
import type { HouseEvent } from "./facts.ts";
import type { House } from "./members.ts";
/** A grant assigns a whole tool; its action kit is checked separately. */
export const allowed = (house: House, by: string, tool: string): boolean =>
  (house.identities === true && by === house.admin && house.grants.has(by)) ||
  house.grants.get(by)?.includes(tool) === true;
export const assigned = (house: House, by: string, tools: readonly string[]): string[] =>
  tools.filter(tool => tool !== "identities" && allowed(house, by, tool));

/** The journal name of a tool's mind; an empty suffix does not name a tool. */
export const mindOf = (tool: string): string => `${ids.mind}${tool}`;
export const mindTool = (actor: string): string | undefined =>
  actor.startsWith(ids.mind) ? actor.slice(ids.mind.length) || undefined : undefined;
/** A mind is an actor only while its own tool exists; it never becomes an identity through a grant. */
export const present = (registry: readonly { id: string }[], house: House, by: string): boolean => {
  const own = mindTool(by);
  return own === undefined ? house.grants.has(by) : own !== "identities" && registry.some(tool => tool.id === own);
};
/** Who may use a tool's adapters while acting: an identity holding the tool, or the mind of that very tool. */
export const holds = (registry: readonly { id: string }[], house: House, by: string, tool: string): boolean =>
  mindTool(by) === undefined ? allowed(house, by, tool) : mindTool(by) === tool && present(registry, house, by);
/** Identities inherit every act of a granted tool; minds receive only explicit acts of their own tool. */
export function allowedAct(house: House, by: string, tool: string, act: string): boolean {
  if (tool === "identities")
    return house.identities === true && (act === "scene" || by === house.admin) && house.grants.has(by);
  const kit = by === house.admin ? undefined : house.kits.get(by)?.get(tool);
  const own = mindTool(by);
  if (own !== undefined) return own === tool && kit !== undefined && (kit === null || kit.includes(act));
  return allowed(house, by, tool) && (kit === undefined || kit === null || kit.includes(act));
}
/** Whether a holder can act at least once on a tool. */
export function holdsAny(house: House, by: string, tool: string, acts: readonly string[]): boolean {
  return acts.some(act => allowedAct(house, by, tool, act));
}
/** Fold scenes and kits without changing the meaning of whole-tool assignments. */
export function kitStep(state: House, event: HouseEvent): House {
  if (event.by !== state.admin) return state;
  if (event.kind === "kit-set") {
    const { holder, tool, acts } = event.data;
    const own = mindTool(holder);
    if (holder === state.admin || (own === undefined ? !allowed(state, holder, tool) : own !== tool)) return state;
    const held = new Map(state.kits.get(holder)).set(tool, acts);
    return { ...state, kits: new Map(state.kits).set(holder, held) };
  }
  if (event.kind === "granted" || (event.kind === "removed" && event.data.identity !== state.admin)) {
    const kits = new Map(state.kits);
    const holder = event.data.identity;
    const tools = event.kind === "granted" ? event.data.tools : [];
    const kept = [...(kits.get(holder) ?? [])].filter(([tool]) => tools.includes(tool));
    if (kept.length) kits.set(holder, new Map(kept));
    else kits.delete(holder);
    return { ...state, kits };
  }
  return state;
}
