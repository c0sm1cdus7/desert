// Wakes a mind for its own journeys and their stops, its rules and the program messages that reach it by thread.
import { ruleWake } from "./rule-wake.ts";
import { journeyWake } from "./journey-wakes.ts";
import { interruptWake } from "./journey-interrupts.ts";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { ProgramMessage } from "../../tools/installable/program.ts";
import type { Event } from "../../journal/vocabulary.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
export type WakePolicy = Readonly<{
  scope: MindScope;
  name: string;
  message: (event: Event) => ProgramMessage | undefined;
  toolOf: (target: string) => string | undefined;
  /** Its own tool talks (signed 22/11): its acts are messages, which wake by their thread, not as acts on the tool. */
  talks: boolean;
  /** A mind with its own waking, such as the supervisor: journeys closing or cut, failed turns and messages. */
  wakes?: (event: Event, history: readonly Event[]) => boolean;
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
export function mindWakeDecision(policy: WakePolicy, event: Event, history: readonly Event[], now: number): boolean {
  requireMind(policy, "policy");
  requireMind(event, "event");
  requireMind(Array.isArray(history), "history");
  requireMind(policy.scope, "policy.scope");
  requireMind(typeof policy.name === "string" && policy.name.trim(), "policy.name");
  requireMind(typeof policy.message === "function", "policy.message");
  requireMind(typeof policy.toolOf === "function", "policy.toolOf");
  requireMind(typeof policy.talks === "boolean", "policy.talks");
  requireMind(Number.isSafeInteger(now) && now >= 0, "now");
  const mind = parseMindActor(policy.scope.actor);
  requireMind(mind, "policy.actor");
  if (policy.wakes) return event.by !== policy.scope.actor && policy.wakes(event, history);
  if (journeyWake(policy.scope, event, history, now) || ruleWake(policy.scope, event, history)) return true;
  if (interruptWake(policy.scope, event, history)) return true;
  if (event.by === policy.scope.actor) return false;
  if (policy.scope.kind !== "consciousness") return false;
  if (
    mind.kind === "tool" &&
    !policy.talks &&
    event.layer === "house" &&
    event.kind === "act" &&
    policy.toolOf(event.data.object) === mind.tool
  )
    return true;
  return addressed(policy, policy.message(event));
}
/** A message wakes by the shape of its thread (signed 22/11): in a thread of two, its author and one other, it always
 * wakes the other; in a group it wakes only the minds it names, whoever wrote it. The thread is its author and its
 * readers, whether or not the reader lists the author. Two minds in a thread of two may answer each other without
 * end: only their judgement stops them, since no code decides when a mind acts. */
export function addressed(policy: WakePolicy, message: ProgramMessage | undefined): boolean {
  if (!message?.to.includes(policy.scope.actor) || message.by === policy.scope.actor) return false;
  if (new Set([message.by, ...message.to]).size === 2) return true;
  return mentions(message.text, policy.name) || mentions(message.text, policy.scope.actor);
}
