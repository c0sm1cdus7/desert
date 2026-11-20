// Derives synthetic work and replies from the talk lines that woke each turn rather than supplying journal facts.
import { isMindActor } from "../../src/fields/mind-actor.ts";
import type { Event } from "../../src/journal/vocabulary.ts";
import { answer, finishWork, history, openWork, say, type RequestHouse } from "./request-mind-fixture.ts";
export type Line = Readonly<{ id: string; by: string; to: string; text: string }>;
/** A talk line as the journal keeps it, or nothing for any other fact. */
export function lineOf(event: Event): Line | undefined {
  if (event.layer !== "program" || event.kind !== "talk/said") return undefined;
  const { data } = event;
  if (!data || typeof data !== "object") return undefined;
  const to: unknown = Reflect.get(data, "to");
  const text: unknown = Reflect.get(data, "text");
  return typeof to === "string" && typeof text === "string" ? { id: event.id, by: event.by, to, text } : undefined;
}
export const lines = (house: RequestHouse): Line[] => history(house).flatMap(event => lineOf(event) ?? []);
/** A mind wakes another mind only by naming it; the name leads the line and the work reads without it. */
export const mention = (actor: string, text: string) => `${actor} ${text}`;
const unmentioned = (text: string) => text.replace(/^(?:mind|assistant):\S+ /u, "");
export function currentTurn(house: RequestHouse) {
  const turn = [...house.tools.state().house.minds.turns.values()].find(turn => !turn.closed)?.opened;
  if (!turn) throw new Error("turn");
  return turn;
}
/** Walks the causes of an event back to the talk line addressed to the notes mind. */
export function causalRequest(events: readonly Event[], causes: readonly string[]): Line {
  const ids = new Set(causes);
  for (const event of [...events].reverse()) {
    if (!ids.has(event.id)) continue;
    const line = lineOf(event);
    if (line?.to === "mind:notes") return line;
    event.cause.forEach(id => ids.add(id));
  }
  throw new Error("request");
}
export function respondToNotes(house: RequestHouse) {
  const turn = currentTurn(house);
  if (turn.by !== "mind:notes") throw new Error("actor");
  if (turn.process) {
    const journey = house.tools.state().house.journeys.get(turn.process);
    if (!journey) throw new Error("journey");
    return answer(finishWork(journey.id, journey.goal));
  }
  const events = history(house);
  const wake = events.filter(event => turn.data.wake.includes(event.id));
  return answer(
    wake.flatMap<import("../../src/tools/minds/mind-answer.ts").ProposedAct>(event => {
      const line = lineOf(event);
      if (line) return [openWork(unmentioned(line.text))];
      if (event.layer !== "house" || event.kind !== "journey-closed") throw new Error("wake.kind");
      const request = causalRequest(events, event.cause);
      const text = unmentioned(request.text);
      return [say(request.by, isMindActor(request.by) ? mention(request.by, text) : text)];
    }),
  );
}
