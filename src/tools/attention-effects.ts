// Reminders follow the actions a person can actually perform.
import { toolReminderLadder } from "../journal/clock.ts";
import { holdsAny } from "../house/kit.ts";
import { houseStep } from "../house/members.ts";
import { effect, type HouseEmission } from "../house/facts.ts";
import type { Event } from "../journal/facts.ts";
import { targetTool } from "../house/attendance.ts";
import type { Program, State, ToolRegistry } from "./tool-contract.ts";
import { reminderId } from "../house/attention.ts";
const reminder = (by: string, tool: string, delay: number | null, event: Event): HouseEmission[] => [
  effect("attention", { tool, delay }, by, [event.id]),
  effect("wake-at", { id: reminderId(by, tool), at: delay === null ? null : event.at + delay }, by, [event.id]),
];
/** A new entry on a tool: who it calls, and whether it starts that identity's reminders. */
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
  return [...reminder(state.by, tool, toolReminderLadder.firstMs, event), stimulus];
}
export function attentionEffects<X extends Program>(
  state: State<X>,
  registry: ToolRegistry<X>,
  event: Event,
): readonly HouseEmission[] {
  if (event.layer !== "house") return [];
  if (event.kind === "attended" && event.by === state.by && !event.process) {
    const tool = targetTool(registry, state, event.data.target);
    return tool && state.attention.has(tool.id) ? reminder(state.by, tool.id, null, event) : [];
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
        : reminder(state.by, tool, null, event),
    );
  if (event.kind === "tool-entry") return entryEffects(state, registry, event);
  if (event.kind !== "woke") return [];
  const current = [...state.attention].find(([tool]) => reminderId(state.by, tool) === event.data.id);
  if (!current) return [];
  const [tool, attention] = current;
  if (!event.cause.includes(attention.wake)) return [];
  const delay = Math.min(attention.delay * toolReminderLadder.multiplier, toolReminderLadder.maxMs);
  return [...reminder(state.by, tool, delay, event), effect("stimulus", { tool }, state.by, [event.id])];
}
