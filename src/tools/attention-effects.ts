// A new entry calls whoever holds its tool once, when it is written; nothing reminds anybody by the clock.
import { holdsAny } from "../house/kit.ts";
import { houseStep } from "../house/members.ts";
import { effect, type HouseEmission } from "../house/facts.ts";
import type { Event } from "../journal/vocabulary.ts";
import { targetTool } from "../house/attendance.ts";
import type { Program, State, ToolRegistry } from "./tool-contract.ts";
/** The tool starts calling this identity, or (with `null`) stops: one fact, no wake and no ladder (21/11). */
const calling = (by: string, tool: string, event: Event): HouseEmission =>
  effect("attention", { tool }, by, [event.id]);
const stopping = (by: string, tool: string, event: Event): HouseEmission =>
  effect("attention", { tool, delay: null }, by, [event.id]);
/** A new entry on a tool: who it calls, and whether that identity starts being called. */
function entryEffects<X extends Program>(
  state: State<X>,
  registry: ToolRegistry<X>,
  event: Extract<Event, { kind: "tool-entry" }>,
): readonly HouseEmission[] {
  const { tool, author, attention, draft, silent } = event.data;
  /** An entry written for the record calls nobody; the rest call whoever holds the tool and did not write it. */
  const quiet =
    silent ||
    !holdsAny(state.house, state.by, tool, Object.keys(registry.find(item => item.id === tool)?.acts ?? {})) ||
    (author === state.by && !attention) ||
    draft;
  if (quiet) return [];
  const stimulus = effect("stimulus", { tool }, state.by, [event.id]);
  if (state.attends.some(target => targetTool(registry, state, target)?.id === tool) || state.attention.has(tool))
    return [stimulus];
  return [calling(state.by, tool, event), stimulus];
}
export function attentionEffects<X extends Program>(
  state: State<X>,
  registry: ToolRegistry<X>,
  event: Event,
): readonly HouseEmission[] {
  if (event.layer !== "house") return [];
  if (event.kind === "attended" && event.by === state.by && !event.process) {
    const tool = targetTool(registry, state, event.data.target);
    return tool && state.attention.has(tool.id) ? [stopping(state.by, tool.id, event)] : [];
  }
  if (
    (event.kind === "granted" || event.kind === "kit-set" || event.kind === "removed") &&
    event.by === state.house.admin
  )
    return [...state.attention.keys()].flatMap(tool =>
      holdsAny(
        houseStep(state.house, event),
        state.by,
        tool,
        Object.keys(registry.find(item => item.id === tool)?.acts ?? {}),
      )
        ? []
        : [stopping(state.by, tool, event)],
    );
  // A reminder armed before 21/11 fires nothing here: the clock no longer arms it, and a `woke` re-arms nothing.
  return event.kind === "tool-entry" ? entryEffects(state, registry, event) : [];
}
