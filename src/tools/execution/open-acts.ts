import type { Event } from "../../journal/facts.ts";
import type { HouseState } from "../tool-contract.ts";
/** The acts still open: an act stays until its result, so what it caused can be traced to it. */
export function openActs(state: HouseState, event: Event): Pick<HouseState, "acts" | "processing" | "wakeOwners"> {
  if (event.layer !== "house") return state;
  const acts = new Map(state.acts);
  const processing = new Map(state.processing);
  if (event.kind === "act") acts.set(event.id, event);
  if (event.kind === "act-started") processing.set(event.data.act, event);
  if (event.kind === "act-result") [acts, processing].forEach(open => open.delete(event.data.act));
  const wakeOwners =
    event.kind === "wake-at" && !state.wakeOwners.has(event.data.id)
      ? new Map(state.wakeOwners).set(event.data.id, event.by)
      : state.wakeOwners;
  return { acts, processing, wakeOwners };
}
