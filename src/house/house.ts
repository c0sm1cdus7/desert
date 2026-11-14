// A house: tool grants, action kits, shared scenes, preferences and reading.
import { ids } from "../catalogs/ids.ts";
import type { Hideable } from "../catalogs/acts.ts";
import { effect, type Event, type HouseBus, type HouseEvent } from "../journal/events.ts";
type Assignment = Readonly<{ identity: string; tools: readonly string[] }>;
export type Creation = Readonly<{ admin: string; assignments: readonly Assignment[] }>;
export type House = Readonly<{ admin: string }> &
  Readonly<{ identities?: boolean; grants: ReadonlyMap<string, readonly string[]> }> &
  /** What each identity prefers not to see: its own to say, and nobody else's. */
  Readonly<{ hides: ReadonlyMap<string, readonly Hideable[]> }> &
  Readonly<{ kits: ReadonlyMap<string, ReadonlyMap<string, readonly string[] | null>> }> &
  Readonly<{ scenes: ReadonlyMap<string, HouseEvent<"scene">> }>;
export type Attention = Readonly<{ delay: number; wake: string }>;
/** What a house knows of each identity: what it keeps in view, what asks for its attention, what it may read. */
export type HouseView = Readonly<{ by: string; house: House; entries: readonly HouseEvent<"tool-entry">[] }> &
  Readonly<{ attends: readonly string[]; attendance: ReadonlyMap<string, readonly string[]> }> &
  Readonly<{ attention: Attentions; attentionBy: ReadonlyMap<string, Attentions> }> &
  /** When each identity last had each target in front: what others wrote there since is news to it. */
  Readonly<{ looked: ReadonlyMap<string, ReadonlyMap<string, number>> }>;
type Attentions = ReadonlyMap<string, Attention>;
const noAttention: Attentions = new Map();
export const emptyHouse: House = {
  admin: "",
  grants: new Map(),
  hides: new Map(),
  kits: new Map(),
  scenes: new Map(),
};
export function houseStep(state: House, event: Event): House {
  if (event.layer !== "house" || namesMind(event)) return state;
  state = kitStep(state, event);
  if (event.kind === "house-created" && !state.admin) {
    const grants = new Map([[event.by, []]]);
    return { ...state, admin: event.by, grants };
  }
  if (event.kind === "preferred" && state.grants.has(event.by)) {
    const rest = (state.hides.get(event.by) ?? []).filter(what => what !== event.data.hide);
    return { ...state, hides: new Map(state.hides).set(event.by, event.data.on ? [...rest, event.data.hide] : rest) };
  }
  if (event.kind === "granted" && event.by === state.admin) {
    const grants = new Map(state.grants).set(event.data.identity, event.data.tools);
    return { ...state, grants };
  }
  /** Who administers the house takes someone out of it, never itself: what they wrote stays, their access goes. */
  if (event.kind === "removed" && event.by === state.admin && event.data.identity !== state.admin) {
    const grants = new Map(state.grants);
    grants.delete(event.data.identity);
    return { ...state, grants };
  }
  /** The house passes to someone who is in it, by the word of who administers it: nobody takes it. */
  if (event.kind === "handed" && event.by === state.admin && state.grants.has(event.data.to))
    return {
      ...state,
      admin: event.data.to,
      kits: new Map([...state.kits].filter(([holder]) => holder !== event.data.to)),
    };
  return state;
}
/** A grant assigns a whole tool; its action kit is checked separately. */
export const allowed = (house: House, by: string, tool: string): boolean =>
  (house.identities === true && by === house.admin && house.grants.has(by)) ||
  house.grants.get(by)?.includes(tool) === true;
export const identityView = <S extends HouseView>(state: S, by: string): S => ({
  ...state,
  by,
  attends: by === state.by ? state.attends : (state.attendance.get(by) ?? []),
  attention: state.attentionBy.get(by) ?? noAttention,
  entries: state.entries,
});
export function createHouse(bus: HouseBus, { admin: by, assignments }: Creation): void {
  bus.emit(effect("house-created", {}, by));
  for (const { identity, tools } of assignments) bus.emit(effect("granted", { identity, tools: [...tools] }, by));
}
/** Whether an identity prefers not to see something. */
export const hides = (house: House, by: string, what: Hideable): boolean =>
  house.hides.get(by)?.includes(what) === true;
export const assigned = (house: House, by: string, tools: readonly string[]): string[] =>
  tools.filter(tool => allowed(house, by, tool));

/** The journal name of a tool's mind; an empty suffix does not name a tool. */
export const mindOf = (tool: string): string => `${ids.mind}${tool}`;
export const mindTool = (actor: string): string | undefined =>
  actor.startsWith(ids.mind) ? actor.slice(ids.mind.length) || undefined : undefined;
/** A mind is an actor only while its own tool exists; it never becomes an identity through a grant. */
export const present = (registry: readonly { id: string }[], house: House, by: string): boolean => {
  const own = mindTool(by);
  return own === undefined ? house.grants.has(by) : registry.some(tool => tool.id === own);
};
/** Who may use a tool's adapters while acting: an identity holding the tool, or the mind of that very tool. */
export const holds = (registry: readonly { id: string }[], house: House, by: string, tool: string): boolean =>
  mindTool(by) === undefined ? allowed(house, by, tool) : mindTool(by) === tool && present(registry, house, by);
/** Identities inherit every act of a granted tool; minds receive only explicit acts of their own tool. */
export function allowedAct(house: House, by: string, tool: string, act: string): boolean {
  if (house.identities && by === house.admin && house.grants.has(by)) return true;
  const kit = by === house.admin ? undefined : house.kits.get(by)?.get(tool);
  const own = mindTool(by);
  if (own !== undefined) return own === tool && kit !== undefined && (kit === null || kit.includes(act));
  return allowed(house, by, tool) && (kit === undefined || kit === null || kit.includes(act));
}
/** Whether a holder can act at least once on a tool. */
export function holdsAny(house: House, by: string, tool: string): boolean {
  if (house.identities && by === house.admin && house.grants.has(by)) return true;
  const kit = house.kits.get(by)?.get(tool);
  if (mindTool(by) !== undefined) return mindTool(by) === tool && kit !== undefined && (kit === null || kit.length > 0);
  return allowed(house, by, tool) && (kit === undefined || kit === null || kit.length > 0);
}
/** Identity-only facts cannot turn a mind into a member or administrator. */
function namesMind(event: HouseEvent): boolean {
  if (event.kind === "house-created") return mindTool(event.by) !== undefined;
  if (event.kind === "granted") return mindTool(event.data.identity) !== undefined;
  if (event.kind === "handed") return mindTool(event.data.to) !== undefined;
  return false;
}
/** Fold scenes and kits without changing the meaning of whole-tool assignments. */
function kitStep(state: House, event: HouseEvent): House {
  if (event.kind === "scene" && (state.grants.has(event.by) || mindTool(event.by) !== undefined))
    return { ...state, scenes: new Map(state.scenes).set(event.by, event) };
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
