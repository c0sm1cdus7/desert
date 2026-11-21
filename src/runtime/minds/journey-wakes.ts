// Wakes a journey on its own facts, and its consciousness once on a cut journey turn, only by facts of the new shape.
import type { Event } from "../../journal/vocabulary.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
/** A journey turn that failed or was cut for anything but a restart, in a journey still open with no later turn. */
function journeyCut(event: Event, history: readonly Event[]): boolean {
  if (event.layer !== "house" || event.kind !== "mind-turn-closed" || !event.process) return false;
  // A closure without a reason comes from before 21/11: nothing historical wakes a mind.
  const { reason, outcome } = event.data;
  if (reason === undefined || reason === "interrupted" || outcome === "done") return false;
  return !history.some(
    e =>
      e.layer === "house" &&
      e.process === event.process &&
      (e.kind === "journey-closed" || (e.kind === "mind-turn-opened" && e.seq > event.seq)),
  );
}
/** The facts of a mind's own journeys that wake it; a journey never wakes because time passed without a fact. */
export function journeyWake(scope: MindScope, event: Event, history: readonly Event[], now: number): boolean {
  if (event.layer !== "house" || event.by !== scope.actor) return false;
  if (scope.kind === "consciousness") return event.kind === "journey-closed" || journeyCut(event, history);
  if (event.process !== scope.process) return false;
  const later = history.filter(e => e.seq > event.seq && e.layer === "house" && e.process === event.process);
  if (later.some(e => e.kind === "journey-closed" || (e.kind === "mind-turn-opened" && e.by === scope.actor)))
    return false;
  if (event.kind === "journey-opened" || event.kind === "journey-resumed") return true;
  // The restart recovery closes the cut turn with this reason: a new fact to look at, not a failure of the mind.
  if (event.kind === "mind-turn-closed") return event.data.reason === "interrupted";
  return event.kind === "journey-waiting" && event.data.until <= now && !later.some(e => e.kind === "journey-waiting");
}
