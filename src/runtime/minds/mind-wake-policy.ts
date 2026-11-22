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
  /** The name people see: a program's name in its words, an assistant's given name, the supervisor's. */
  name: string;
  message: (event: Event) => ProgramMessage | undefined;
  toolOf: (target: string) => string | undefined;
  /** Its own tool talks (signed 22/11): its acts are messages, which wake by their thread, not as acts on the tool. */
  talks: boolean;
  /** A mind with its own waking, such as the supervisor: journeys closing or cut, failed turns and messages. */
  wakes?: (event: Event, history: readonly Event[]) => boolean;
}>;
const normalized = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
/** Named (signed 22/11): «@» and the name, the «@» at the start or after no letter, digit or «_», the name ending the
 * text or followed by none of those; case, accents and any run of whitespace inside the name do not matter. A name of
 * accents alone, which the house accepts, is nothing once they go: it names nobody and breaks no other mind's wake. */
function mentions(text: string, name: string): boolean {
  const wanted = normalized(name).trim();
  if (!wanted) return false;
  const words = wanted.split(/\s+/u).map(literal).join("\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}_])@${words}(?![\\p{L}\\p{N}_])`, "u").test(normalized(text));
}
/** `heard` is the last fact the mind already had in front of it (22/11): a message at or before it wakes nobody, so
 * a rule that changes never wakes a mind for the past. Nothing but messages heeds it. */
export function mindWakeDecision(
  policy: WakePolicy,
  event: Event,
  history: readonly Event[],
  now: number,
  heard = 0,
): boolean {
  requireMind(policy, "policy");
  requireMind(event, "event");
  requireMind(Array.isArray(history), "history");
  requireMind(policy.scope, "policy.scope");
  requireMind(typeof policy.name === "string" && policy.name.trim(), "policy.name");
  requireMind(typeof policy.message === "function", "policy.message");
  requireMind(typeof policy.toolOf === "function", "policy.toolOf");
  requireMind(typeof policy.talks === "boolean", "policy.talks");
  requireMind(Number.isSafeInteger(now) && now >= 0, "now");
  requireMind(Number.isSafeInteger(heard) && heard >= 0, "heard");
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
  return event.seq > heard && addressed(policy, policy.message(event));
}
/** A message wakes by the shape of its thread (signed 22/11): in a thread of two, its author and one other, it always
 * wakes the other; in a group it wakes only the minds it names with «@», whoever wrote it. The thread is its author
 * and its readers, whether or not the reader lists the author. Two minds in a thread of two may answer each other
 * without end: only their judgement stops them, since no code decides when a mind acts. */
export function addressed(policy: WakePolicy, message: ProgramMessage | undefined): boolean {
  if (!message?.to.includes(policy.scope.actor) || message.by === policy.scope.actor) return false;
  if (new Set([message.by, ...message.to]).size === 2) return true;
  return mentions(message.text, policy.name) || mentions(message.text, policy.scope.actor);
}
