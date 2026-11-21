// Wakes a consciousness once when the supervisor stops one of its journeys, and says why and what was left pending.
import type { Language } from "../../fields/languages.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { journeyInterrupted } from "../../texts/journey.texts.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
/** The supervisor's stop wakes the consciousness that owns the journey, while the journey is still open and stopped. */
export function interruptWake(scope: MindScope, event: Event, history: readonly Event[]): boolean {
  if (scope.kind !== "consciousness" || event.layer !== "house" || event.kind !== "journey-interrupted") return false;
  const owner = history.find(
    e => e.layer === "house" && e.kind === "journey-opened" && e.process === event.process,
  )?.by;
  if (owner !== scope.actor) return false;
  return !history.some(
    e =>
      e.seq > event.seq &&
      e.layer === "house" &&
      e.process === event.process &&
      (e.kind === "journey-closed" || e.kind === "journey-resumed"),
  );
}
/** What the stopped journey left: plan steps not done, acts still running, device work still running. */
function pendingOf<X extends Program>(state: State<X>, journey: string): string {
  const steps = state.house.journeys.get(journey)?.steps.filter(step => step.note === undefined) ?? [];
  const acts = [...state.processing.values()].filter(act => act.process === journey);
  const devices = [...state.house.devices.executions.values()].filter(
    execution => execution.journey === journey && execution.status === "running",
  );
  return [
    ...steps.map(step => step.text),
    ...acts.map(act => `${act.data.option} → ${act.data.object}`),
    ...devices.map(execution => `${execution.program} ${execution.action} (${execution.device})`),
  ].join("; ");
}
/** The waking lines with the supervisor's stops in words; any other line stays as it was. */
export function withInterrupts<X extends Program>(
  lines: readonly string[] | undefined,
  wake: readonly string[],
  history: readonly Event[],
  state: State<X>,
  language: Language,
): readonly string[] | undefined {
  const stops = new Map(
    history.flatMap(event =>
      wake.includes(event.id) && event.layer === "house" && event.kind === "journey-interrupted" && event.process
        ? [[event.id, { reason: event.data.reason, journey: event.process }] as const]
        : [],
    ),
  );
  if (!stops.size) return lines;
  return wake.map((id, index) => {
    const stop = stops.get(id);
    if (!stop) return lines?.[index] ?? id;
    const goal = state.house.journeys.get(stop.journey)?.goal ?? stop.journey;
    return journeyInterrupted.text(language, { goal, reason: stop.reason, pending: pendingOf(state, stop.journey) });
  });
}
