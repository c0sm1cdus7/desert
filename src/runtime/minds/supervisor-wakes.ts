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
/** Whether every fact that woke this consciousness turn was the supervisor's own doing: its failure then tells the
 * supervisor nothing but the effect of what it did, and waking for it would have the two answer each other forever.
 * A journey it stopped is its doing only when the failed turn `acted`: a turn that applied nothing left the journey
 * frozen and undecided, and its failure wakes the supervisor; one that applied an act (resumed the journey, opened
 * another) left something the supervisor could stop again, so waking for it would loop through stops. A turn whose
 * opening the journal does not hold, or that nothing woke, is not its doing either. */
function ownDoing(actor: string, turn: string, acted: boolean, history: readonly Event[]): boolean {
  const opened = history.find(e => e.layer === "house" && e.kind === "mind-turn-opened" && e.data.turn === turn);
  if (opened?.layer !== "house" || opened.kind !== "mind-turn-opened" || !opened.data.wake.length) return false;
  const woke = new Set(opened.data.wake);
  const own = (e: Event): boolean =>
    e.by === actor && (acted || !(e.layer === "house" && e.kind === "journey-interrupted"));
  return history.filter(e => woke.has(e.id) && own(e)).length === woke.size;
}
/** Nothing at or before `since` wakes it, so a new supervisor does not live the house's history on deploy; no
 * clock and no step of any journey wakes it either. */
export function supervisorWakes(policy: WakePolicy, since: number, event: Event, history: readonly Event[]): boolean {
  const { actor } = policy.scope;
  if (event.seq <= since || event.by === actor) return false;
  if (event.layer === "house" && event.kind === "journey-closed") return true;
  if (event.layer === "house" && event.kind === "mind-turn-closed" && cut(event))
    return event.process !== undefined || !ownDoing(actor, event.data.turn, event.data.applied.length > 0, history);
  return addressed(policy, policy.message(event));
}
