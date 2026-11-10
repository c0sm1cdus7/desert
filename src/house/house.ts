// A house: who administers it, which whole tools each identity has, and who is in each channel.
import type { Hideable } from "../catalogs/acts.ts";
import { ids } from "../catalogs/ids.ts";
import { createHash } from "node:crypto";
import { effect, type Event, type HouseBus, type HouseEvent } from "../journal/events.ts";
type Assignment = Readonly<{ identity: string; tools: readonly string[] }>;
export type Creation = Readonly<{ admin: string; assignments: readonly Assignment[] }>;
export type House = Readonly<{ admin: string }> &
  Readonly<Record<"grants" | "channels", ReadonlyMap<string, readonly string[]>>> &
  /** What each identity prefers not to see: its own to say, and nobody else's. */
  Readonly<{ hides: ReadonlyMap<string, readonly Hideable[]> }>;
export type Attention = Readonly<{ delay: number; wake: string }>;
/** What a house knows of each identity: what it keeps in view, what asks for its attention, what it may read. */
export type HouseView = Readonly<{ by: string; house: House; entries: readonly HouseEvent<"tool-entry">[] }> &
  Readonly<{ attends: readonly string[]; attendance: ReadonlyMap<string, readonly string[]> }> &
  Readonly<{ attention: Attentions; attentionBy: ReadonlyMap<string, Attentions> }>;
type Attentions = ReadonlyMap<string, Attention>;
const noAttention: Attentions = new Map();
export const houseChannel: string = ids.houseChannel;
export const emptyHouse: House = { admin: "", grants: new Map(), channels: new Map(), hides: new Map() };
export function houseStep(state: House, event: Event): House {
  if (event.layer !== "house") return state;
  if (event.kind === "house-created" && !state.admin) {
    const grants = new Map([[event.by, []]]);
    return { ...state, admin: event.by, grants, channels: new Map([[houseChannel, [event.by]]]) };
  }
  if (event.kind === "preferred" && state.grants.has(event.by)) {
    const rest = (state.hides.get(event.by) ?? []).filter(what => what !== event.data.hide);
    return { ...state, hides: new Map(state.hides).set(event.by, event.data.on ? [...rest, event.data.hide] : rest) };
  }
  if (event.kind === "granted" && event.by === state.admin) {
    const grants = new Map(state.grants).set(event.data.identity, event.data.tools);
    return { ...state, grants, channels: new Map(state.channels).set(houseChannel, [...grants.keys()].sort()) };
  }
  if (event.kind === "channel-created") {
    const channel = channelFor(state, event.by, event.data.members);
    if (channel?.id === event.data.channel)
      return { ...state, channels: new Map(state.channels).set(channel.id, channel.members) };
  }
  return state;
}
/** The whole tool is the only unit of assignment. */
export const allowed = (house: House, by: string, tool: string): boolean =>
  house.grants.get(by)?.includes(tool) === true;
export function channelFor(house: House, by: string, channel: string | readonly string[]) {
  const members = typeof channel === "string" ? house.channels.get(channel) : [...new Set(channel)].sort();
  if (!members?.includes(by) || members.some(id => !house.grants.has(id))) return undefined;
  const id =
    typeof channel === "string"
      ? channel
      : `${ids.communicator}${createHash("sha256").update(JSON.stringify(members)).digest("hex")}`;
  return { id, members };
}
/** What happens in a channel is read by its members alone; anything else in the house, by whoever has the tool. */
export const inChannel = (house: House, place: string, by: string): boolean =>
  !place.startsWith(ids.communicator) || house.channels.get(place)?.includes(by) === true;
export function visible(house: House, event: Event, by: string): boolean {
  if (event.layer !== "house") return true;
  if (event.kind === "tool-entry")
    return (!event.data.recipient || event.data.recipient === by) && inChannel(house, event.data.target, by);
  if (event.kind === "act-done")
    return (!event.data.recipient || event.data.recipient === by) && inChannel(house, event.data.object, by);
  return true;
}
export const identityView = <S extends HouseView>(state: S, by: string): S => ({
  ...state,
  by,
  attends: by === state.by ? state.attends : (state.attendance.get(by) ?? []),
  attention: state.attentionBy.get(by) ?? noAttention,
  entries: state.entries.filter(entry => visible(state.house, entry, by)),
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
