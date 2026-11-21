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
/** Nothing at or before `since` wakes it, so a new supervisor does not live the house's history on deploy; no
 * clock and no step of any journey wakes it either. */
export function supervisorWakes(policy: WakePolicy, since: number, event: Event): boolean {
  if (event.seq <= since || event.by === policy.scope.actor) return false;
  if (event.layer === "house" && (event.kind === "journey-closed" || cut(event))) return true;
  return addressed(policy, policy.message(event));
}
