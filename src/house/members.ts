// A house: tool grants, action kits, shared scenes, preferences and reading.
import type { KitMigration } from "./kit-migration.ts";
import { selectionStep } from "./kit-history.ts";
import { programKit, type KitLayout, type SelectionKit } from "./kit-selection.ts";
import { mindHouseStep } from "./minds/mind-house-state.ts";
import { sceneStep } from "./scenes.ts";
import { readonlyState } from "../journal/readonly-state.ts";
import type { Hideable } from "./own-acts.ts";
import { effect, type HouseEvent } from "./facts.ts";
import type { Event, HouseBus } from "../journal/vocabulary.ts";
import { kitStep } from "./kit.ts";
import { isMindActor } from "../fields/mind-actor.ts";
import { type AssistantState } from "./assistants/assistant-state.ts";
import { type MindAssignment } from "./minds/mind-settings.ts";
import { emptyMindState, type MindState } from "./minds/mind-state.ts";
import { type Journeys } from "./minds/journey-state.ts";
import { type ModelCalls } from "./minds/model-call-state.ts";

export { checkCreation, checkIdentity, guardJournal, InvalidCreation } from "./identities/guards.ts";
type Assignment = Readonly<{ identity: string; tools: readonly string[] }>;
export type Creation = Readonly<{ admin: string; assignments: readonly Assignment[] }>;
export type House = Readonly<{
  admin: string;
  selections?: ReadonlyMap<string, SelectionKit>;
  kitLayout?: KitLayout;
  kitMigration?: KitMigration;
}> &
  Readonly<{
    assistants: ReadonlyMap<string, AssistantState>;
    mindAssignments: ReadonlyMap<string, MindAssignment>;
    minds: MindState;
    journeys: Journeys;
    modelCalls: ModelCalls;
  }> &
  Readonly<{ identities?: boolean; grants: ReadonlyMap<string, readonly string[]> }> &
  /** What each identity prefers not to see: its own to say, and nobody else's. */
  Readonly<{ hides: ReadonlyMap<string, readonly Hideable[]> }> &
  Readonly<{ kits: ReadonlyMap<string, ReadonlyMap<string, readonly string[] | null>> }> &
  Readonly<{ scenes: ReadonlyMap<string, HouseEvent<"scene">> }> &
  Readonly<{ names: ReadonlyMap<string, string>; removed: ReadonlySet<string> }>;
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
  assistants: new Map(),
  mindAssignments: new Map(),
  minds: emptyMindState,
  journeys: new Map(),
  modelCalls: new Map(),
  grants: new Map(),
  hides: new Map(),
  kits: new Map(),
  scenes: new Map(),
  names: new Map(),
  removed: new Set(),
};
export function houseStep(state: House, event: Event): House {
  if (event.layer !== "house" || namesMind(event)) return state;
  state = mindHouseStep(state, event);
  state = sceneStep(state, event);
  state = selectionStep(state, event);
  state = kitStep(state, event);
  if (event.kind === "house-created" && !state.admin) {
    const grants = new Map([[event.by, []]]);
    return { ...state, admin: event.by, grants };
  }
  if (event.kind === "preferred" && state.grants.has(event.by)) {
    const rest = (state.hides.get(event.by) ?? []).filter(what => what !== event.data.hide);
    return { ...state, hides: new Map(state.hides).set(event.by, event.data.on ? [...rest, event.data.hide] : rest) };
  }
  if (event.kind === "granted" && event.by === state.admin) return grantedMember(state, event);
  /** Who administers the house takes someone out of it, never itself: what they wrote stays, their access goes. */
  if (event.kind === "removed" && event.by === state.admin && event.data.identity !== state.admin) {
    const grants = new Map(state.grants);
    grants.delete(event.data.identity);
    const removed = new Set(state.removed);
    if (state.grants.has(event.data.identity)) removed.add(event.data.identity);
    return { ...state, grants, removed };
  }
  if (
    event.kind === "named" &&
    (event.by === state.admin || (event.data.identity === event.by && state.grants.has(event.by)))
  )
    return { ...state, names: new Map(state.names).set(event.data.identity, event.data.name) };
  /** The house passes to someone who is in it, by the word of who administers it: nobody takes it. */
  if (event.kind === "handed" && event.by === state.admin && state.grants.has(event.data.to))
    return {
      ...state,
      admin: event.data.to,
      kits: new Map([...state.kits].filter(([holder]) => holder !== event.data.to)),
    };
  return state;
}
export const identityView = <S extends HouseView>(state: S, by: string): S =>
  readonlyState({
    ...state,
    by,
    attends: by === state.by ? state.attends : (state.attendance.get(by) ?? []),
    attention: state.attentionBy.get(by) ?? noAttention,
    entries: state.entries,
  });
export function createHouse(bus: HouseBus, { admin: by, assignments }: Creation): void {
  bus.emit(effect("house-created", {}, by));
  for (const { identity, tools } of assignments)
    bus.emit(effect("granted", { version: 2, identity, kit: programKit(tools) }, by));
}
/** The name shown for an identity defaults to its identifier. */
export const identityDisplayName = (house: House, identity: string): string => house.names.get(identity) ?? identity;
/** Whether an identity prefers not to see something. */
export const hides = (house: House, by: string, what: Hideable): boolean =>
  house.hides.get(by)?.includes(what) === true;
/** Identity-only facts cannot turn a mind into a member or administrator. */
function namesMind(event: HouseEvent): boolean {
  if (event.kind === "house-created") return isMindActor(event.by);
  if (event.kind === "granted") return isMindActor(event.data.identity);
  if (event.kind === "handed") return isMindActor(event.data.to);
  return false;
}

function grantedMember(state: House, event: HouseEvent<"granted">): House {
  const tools = (
    "version" in event.data
      ? [...new Set(event.data.kit.selections.map(selection => selection.program))]
      : event.data.tools
  ).filter(tool => tool !== "identities");
  const grants = new Map(state.grants).set(event.data.identity, tools);
  const removed = new Set(state.removed);
  removed.delete(event.data.identity);
  return { ...state, grants, removed };
}
