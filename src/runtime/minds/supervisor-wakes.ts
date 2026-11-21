// Wakes the house supervisor's own turn only by facts: a journey closing or cut, a mind's failed turn, or a line to it.
import type { Event } from "../../journal/vocabulary.ts";
import { addressed, type WakePolicy } from "./mind-wake-policy.ts";
/** A journey turn cut or failed, or a consciousness turn that closed otherwise than done, for anything but the restart
 * recovery, which is no failure of any mind. A closure without a reason comes from before 21/11 and wakes nobody. */
const cut = (event: Event): boolean =>
  event.layer === "house" &&
  event.kind === "mind-turn-closed" &&
  event.data.reason !== undefined &&
  event.data.reason !== "interrupted" &&
  (event.process !== undefined || event.data.outcome !== "done");
/** Whether every fact that woke this consciousness turn was a line of the supervisor itself: its failure then tells
 * the supervisor nothing but the effect of its own line, and waking for it would have the two answer each other
 * forever. Only its lines are its doing: a journey it stopped is not, and the failure of the consciousness that had to
 * decide on it wakes the supervisor. A turn whose opening the journal does not hold, or that nothing woke, is not
 * its doing either. */
function ownDoing(actor: string, turn: string, history: readonly Event[]): boolean {
  const opened = history.find(e => e.layer === "house" && e.kind === "mind-turn-opened" && e.data.turn === turn);
  if (opened?.layer !== "house" || opened.kind !== "mind-turn-opened" || !opened.data.wake.length) return false;
  const woke = new Set(opened.data.wake);
  const line = (e: Event): boolean => e.by === actor && !(e.layer === "house" && e.kind === "journey-interrupted");
  return history.filter(e => woke.has(e.id) && line(e)).length === woke.size;
}
/** Nothing at or before `since` wakes it, so a new supervisor does not live the house's history on deploy; no
 * clock and no step of any journey wakes it either. */
export function supervisorWakes(policy: WakePolicy, since: number, event: Event, history: readonly Event[]): boolean {
  const { actor } = policy.scope;
  if (event.seq <= since || event.by === actor) return false;
  if (event.layer === "house" && event.kind === "journey-closed") return true;
  if (event.layer === "house" && event.kind === "mind-turn-closed" && cut(event))
    return event.process !== undefined || !ownDoing(actor, event.data.turn, history);
  return addressed(policy, policy.message(event));
}
