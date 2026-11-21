// Wakes a journey on its own facts and its devices' word, and its consciousness once on a cut turn, by new shapes only.
import type { HouseEvent } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
/** A journey turn that failed or was cut for anything but a restart, in a journey still open with no later turn. */
function cutTurn(event: Event, history: readonly Event[]): boolean {
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
/** Whether the journey closed, or went on in a turn of its own after this fact: then the fact was read. */
function readOrClosed(scope: MindScope, event: Event, history: readonly Event[]): boolean {
  return history.some(
    e =>
      e.layer === "house" &&
      e.process === scope.process &&
      (e.kind === "journey-closed" || (e.kind === "mind-turn-opened" && e.by === scope.actor && e.seq > event.seq)),
  );
}
/** A device a person retired wakes each journey with announcing work on it still without its notice: that notice
 * will not come. Only executions of the 21/11 shape announce, so no retirement from before wakes anybody. */
function retiredWake(scope: MindScope, event: HouseEvent<"device-retired">, history: readonly Event[]): boolean {
  if (scope.kind !== "journey" || readOrClosed(scope, event, history)) return false;
  const first = history.find(
    e => e.layer === "house" && e.kind === "device-retired" && e.data.device === event.data.device,
  );
  if (first?.id !== event.id) return false;
  const ended = new Set(
    history.flatMap(e =>
      e.seq < event.seq &&
      e.layer === "house" &&
      (e.kind === "device-execution-notice" || (e.kind === "device-execution-result" && e.data.status === "rejected"))
        ? [e.data.execution]
        : [],
    ),
  );
  return history.some(
    e =>
      e.seq < event.seq &&
      e.layer === "house" &&
      e.kind === "device-execution-started" &&
      e.data.announces === true &&
      e.data.journey === scope.process &&
      e.data.device === event.data.device &&
      !ended.has(e.data.execution),
  );
}
/** The facts of a mind's own journeys that wake it; a journey never wakes because time passed without a fact. */
export function journeyWake(scope: MindScope, event: Event, history: readonly Event[], now: number): boolean {
  if (event.layer === "house" && event.kind === "device-retired") return retiredWake(scope, event, history);
  if (event.layer !== "house" || event.by !== scope.actor) return false;
  if (scope.kind === "consciousness") return event.kind === "journey-closed" || cutTurn(event, history);
  if (event.process !== scope.process) return false;
  const later = history.filter(e => e.seq > event.seq && e.layer === "house" && e.process === event.process);
  if (later.some(e => e.kind === "journey-closed" || (e.kind === "mind-turn-opened" && e.by === scope.actor)))
    return false;
  if (event.kind === "journey-opened" || event.kind === "journey-resumed") return true;
  // A device's notice wakes the journey that started that work, whatever it waited on, and once its turn closed.
  if (event.kind === "device-execution-notice") return !readOrClosed(scope, event, history);
  // The restart recovery closes the cut turn with this reason: a new fact to look at, not a failure of the mind.
  if (event.kind === "mind-turn-closed") return event.data.reason === "interrupted";
  if (event.kind !== "journey-waiting" || afterItsTurn(event, history)) return false;
  // A wait on a notice without an hour has no hour to come: only the notice or the device's retirement wakes it.
  const { until } = event.data;
  return until !== undefined && until <= now && !later.some(e => e.kind === "journey-waiting");
}
/** A mind chooses its wait inside its turn. A wait written after its turn closed came from the 90-second follow-up
 * deleted on 21/11: it is no hour any mind chose, so it wakes nobody. */
function afterItsTurn(event: Event, history: readonly Event[]): boolean {
  const turns = history.flatMap(e =>
    e.layer === "house" && e.kind === "mind-turn-opened" && event.cause.includes(e.id) ? [e.data.turn] : [],
  );
  return history.some(
    e => e.seq < event.seq && e.layer === "house" && e.kind === "mind-turn-closed" && turns.includes(e.data.turn),
  );
}
