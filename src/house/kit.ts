// Whole-tool grants and action kits for identities and minds, with the same membership guards.
import { journeyAllows } from "./minds/journey-state.ts";
import { holderKit } from "./kit-history.ts";
import { herramientaDe, kitLayout, selects } from "./kit-selection.ts";
import { requireMind } from "../fields/mind-errors.ts";
import { ids } from "./ids.ts";
import { isMindActor, parseMindActor } from "../fields/mind-actor.ts";
import { effectiveAssistantKit, type MindTools } from "./assistants/assistant-state.ts";
import type { HouseEvent } from "./facts.ts";
import type { House } from "./members.ts";
import { allowed, identityAllowedAct } from "./identities/identity-permissions.ts";
export { allowed } from "./identities/identity-permissions.ts";
export const assigned = (house: House, by: string, tools: readonly string[]): string[] =>
  tools.filter(tool => tool !== "identities" && allowed(house, by, tool));

/** The journal name of a tool's mind; an empty suffix does not name a tool. */
export const mindOf = (tool: string): string => `${ids.mind}${tool}`;
export const mindTool = (actor: string): string | undefined =>
  actor.startsWith(ids.mind) ? actor.slice(ids.mind.length) || undefined : undefined;
/** A mind is an actor only while its own tool exists; it never becomes an identity through a grant. */
export const present = (registry: readonly { id: string }[], house: House, by: string): boolean => {
  const actor = parseMindActor(by);
  if (actor?.kind === "assistant")
    return house.assistants.get(actor.owner)?.enabled === true && house.grants.has(actor.owner);
  if (isMindActor(by) && !actor) return false;
  const own = mindTool(by);
  return own === undefined ? house.grants.has(by) : own !== "identities" && registry.some(tool => tool.id === own);
};
/** Who may use a tool's adapters while acting: an identity holding the tool, or the mind of that very tool. */
export function holds(registry: MindTools, house: House, by: string, tool: string): boolean {
  const actor = parseMindActor(by);
  if (actor?.kind === "assistant")
    return effectiveAssistantKit(house, actor.owner, registry).some(each => each.tool === tool);
  return mindTool(by) === undefined ? allowed(house, by, tool) : mindTool(by) === tool && present(registry, house, by);
}
/** Identities inherit every act of a granted tool; minds receive only explicit acts of their own tool. */
export function allowedAct(house: House, by: string, tool: string, act: string, registry?: MindTools): boolean {
  const actor = parseMindActor(by);
  if (actor?.kind === "assistant") {
    requireMind(registry, "registry");
    return effectiveAssistantKit(house, actor.owner, registry).some(
      each => each.tool === tool && each.acts.includes(act),
    );
  }
  if (isMindActor(by) && !actor) return false;
  if (tool === "identities") return !isMindActor(by) && identityAllowedAct(house, by, tool, act);
  const layout = registry ? kitLayout(registry) : house.kitLayout;
  const own = mindTool(by);
  if (own !== undefined)
    return own === tool && selects(holderKit(house, by), tool, herramientaDe(tool, act, layout), act);
  return identityAllowedAct(house, by, tool, act, layout);
}
/** Whether a holder can act at least once on a tool. */
export function holdsAny(
  house: House,
  by: string,
  tool: string,
  acts: readonly string[],
  registry?: MindTools,
): boolean {
  return acts.some(act => allowedAct(house, by, tool, act, registry));
}
/** Fold scenes and kits without changing the meaning of whole-tool assignments. */
export function kitStep(state: House, event: HouseEvent): House {
  if (event.by !== state.admin) return state;
  if (event.kind === "kit-set") {
    if ("version" in event.data)
      return { ...state, kits: new Map([...state.kits].filter(([holder]) => holder !== event.data.holder)) };
    const { holder, tool, acts } = event.data;
    if (holder.startsWith("assistant:")) return state;
    const own = mindTool(holder);
    if (holder === state.admin || (own === undefined ? !state.grants.get(holder)?.includes(tool) : own !== tool))
      return state;
    const held = new Map(state.kits.get(holder)).set(tool, acts);
    return { ...state, kits: new Map(state.kits).set(holder, held) };
  }
  if (event.kind === "granted" || (event.kind === "removed" && event.data.identity !== state.admin)) {
    const kits = new Map(state.kits);
    const holder = event.data.identity;
    const tools = event.kind === "granted" && !("version" in event.data) ? event.data.tools : [];
    const kept = [...(kits.get(holder) ?? [])].filter(([tool]) => tools.includes(tool));
    if (kept.length) kits.set(holder, new Map(kept));
    else kits.delete(holder);
    return { ...state, kits };
  }
  return state;
}
/** Current installed actions; journeys intersect this result again at every execution boundary. */
export function effectiveKit(house: House, by: string, registry: MindTools, process?: string) {
  return registry
    .filter(program => program.id !== "identities")
    .flatMap(program => {
      const acts = Object.keys(program.acts ?? {}).filter(
        action =>
          allowedAct(house, by, program.id, action, registry) &&
          (process === undefined ||
            journeyAllows(house.journeys, process, by, program.id, action, kitLayout(registry), house.kitMigration)),
      );
      return acts.length ? [{ tool: program.id, acts }] : [];
    });
}
