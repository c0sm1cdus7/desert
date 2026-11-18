// Routes native requests and causal replies to the correct mind or journey.
import { ruleWake } from "./rule-wake.ts";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { Event } from "../../journal/vocabulary.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
export type WakePolicy = Readonly<{
  scope: MindScope;
  name: string;
  message: (event: Event) => Readonly<{ text: string; to?: string }> | undefined;
  toolOf: (target: string) => string | undefined;
}>;
const normalized = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
function mentions(text: string, name: string): boolean {
  const source = normalized(text);
  const wanted = normalized(name);
  requireMind(wanted.trim(), "policy.name");
  let at = source.indexOf(wanted);
  while (at >= 0) {
    const before = Array.from(source.slice(0, at)).at(-1) ?? "";
    const after = Array.from(source.slice(at + wanted.length))[0] ?? "";
    if (!/[\p{L}\p{N}_]/u.test(before) && !/[\p{L}\p{N}_]/u.test(after)) return true;
    at = source.indexOf(wanted, at + 1);
  }
  return false;
}
/** Replies resume the requesting process; fresh messages need a native action or turn origin. */
function directed(policy: WakePolicy, event: Event, history: readonly Event[]): boolean {
  if (
    event.layer !== "house" ||
    (event.kind !== "mind-message" && event.kind !== "mind-requested") ||
    event.data.to !== policy.scope.actor
  )
    return false;
  const ancestors = new Set(event.cause);
  let native = event.kind === "mind-message" && event.cause.length === 0;
  for (const previous of [...history].reverse()) {
    if (previous.seq >= event.seq || !ancestors.has(previous.id)) continue;
    if (previous.layer === "house") {
      if (previous.kind === "mind-message" && previous.by === policy.scope.actor && previous.data.to === event.by)
        return previous.process === policy.scope.process;
      if (
        previous.by === event.by &&
        ((event.kind === "mind-message" &&
          previous.kind === "mind-turn-opened" &&
          previous.data.turn === event.data.turn) ||
          (previous.kind === "act" && previous.data.option === "message" && previous.data.object === event.data.to))
      )
        native = true;
    }
    previous.cause.forEach(id => ancestors.add(id));
  }
  return native && policy.scope.kind === "consciousness";
}
function lifecycle(policy: WakePolicy, event: Event, history: readonly Event[], now: number): boolean {
  if (event.layer !== "house" || event.by !== policy.scope.actor) return false;
  if (policy.scope.kind === "consciousness") return event.kind === "journey-closed";
  if (event.process !== policy.scope.process) return false;
  const later = history.filter(e => e.seq > event.seq && e.layer === "house" && e.process === event.process);
  if (later.some(e => e.kind === "journey-closed" || (e.kind === "mind-turn-opened" && e.by === policy.scope.actor)))
    return false;
  if (event.kind === "journey-opened") return true;
  return event.kind === "journey-waiting" && event.data.until <= now && !later.some(e => e.kind === "journey-waiting");
}
export function mindWakeDecision(policy: WakePolicy, event: Event, history: readonly Event[], now: number): boolean {
  requireMind(policy, "policy");
  requireMind(event, "event");
  requireMind(Array.isArray(history), "history");
  requireMind(policy.scope, "policy.scope");
  requireMind(typeof policy.name === "string" && policy.name.trim(), "policy.name");
  requireMind(typeof policy.message === "function", "policy.message");
  requireMind(typeof policy.toolOf === "function", "policy.toolOf");
  requireMind(Number.isSafeInteger(now) && now >= 0, "now");
  const mind = parseMindActor(policy.scope.actor);
  requireMind(mind, "policy.actor");
  if (lifecycle(policy, event, history, now) || ruleWake(policy.scope, event, history)) return true;
  if (event.by === policy.scope.actor) return false;
  if (event.layer === "house" && (event.kind === "mind-message" || event.kind === "mind-requested"))
    return directed(policy, event, history);
  if (mind.kind === "tool" && policy.scope.kind === "consciousness")
    return event.layer === "house" && event.kind === "act" && policy.toolOf(event.data.object) === mind.tool;
  if (policy.scope.kind !== "consciousness") return false;
  const message = policy.message(event);
  return !!message && (message.to === policy.scope.actor || mentions(message.text, policy.name));
}
