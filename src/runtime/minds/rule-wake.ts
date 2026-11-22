// A new rule version wakes processes held by that rule; it never runs their acts again.
import type { Event } from "../../journal/vocabulary.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
function administrator(history: readonly Event[], through: number): string {
  let admin = "";
  for (const event of history) {
    if (event.seq >= through || event.layer !== "house") continue;
    if (event.kind === "house-created" && !admin) admin = event.by;
    if (event.kind === "handed" && event.by === admin) admin = event.data.to;
  }
  return admin;
}
function changed(event: Event, history: readonly Event[]): string | undefined {
  if (event.layer !== "house") return undefined;
  if (event.kind === "rule-approved" || event.kind === "rule-retired") return event.data.id;
  if (event.kind === "rule-versioned" && event.by === administrator(history, event.seq))
    return event.data.definition.id;
  return undefined;
}
export function ruleWake(scope: MindScope, event: Event, history: readonly Event[]): boolean {
  const id = changed(event, history);
  if (!id) return false;
  let since = 0;
  for (const previous of history) {
    if (previous.seq < event.seq && changed(previous, history) === id) since = previous.seq;
  }
  return history.some(
    previous =>
      previous.seq > since &&
      previous.seq < event.seq &&
      previous.layer === "house" &&
      previous.kind === "rule-evaluated" &&
      previous.by === scope.actor &&
      previous.process === scope.process &&
      previous.data.results.some(result => result.id === id && result.outcome !== "passed"),
  );
}
