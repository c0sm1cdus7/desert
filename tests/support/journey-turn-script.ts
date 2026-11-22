// Drives the notes mind of the program fixture by scope: what its consciousness and each journey call answer.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { effect } from "../../src/house/facts.ts";
import { selectionKit } from "../../src/house/kit-selection.ts";
import type { MindAnswer, ProposedAct } from "../../src/tools/minds/mind-answer.ts";
import type { programMindFixture } from "./program-mind-fixture.ts";
type Fixture = ReturnType<typeof programMindFixture>;
type House = Awaited<ReturnType<Fixture["open"]>>;
export const openAct = {
  act: "open",
  target: "mind:notas",
  input: { goal: "Anotar", kit: [{ tool: "notas", acts: ["personal/add"] }] },
};
export const addAct = { act: "personal/add", target: "notas/personal", input: {} };
export const waitAct = (id: string): ProposedAct => ({
  act: "wait",
  target: id,
  input: { what: "Espero", until: Date.now() + 3_600_000 },
});
/** One call as the transport saw it: whose turn it was, how many calls that scope had made, the request, and the
 * journey the consciousness opened, once it exists. */
export type Seen = Readonly<{ journey?: string; call: number; changing: string; body: string; opened?: string }>;
type Answer = (seen: Seen) => readonly ProposedAct[] | MindAnswer;
const shown = Type.Object({ messages: Type.Array(Type.Object({ role: Type.String(), content: Type.Unknown() })) });
/** The messages a call sent, in order. */
export function messagesOf(seen: Seen) {
  const body: unknown = JSON.parse(seen.body);
  if (!Value.Check(shown, body)) throw new Error("messages");
  return body.messages;
}
/** Gives the notes mind its kit and answers each call by the scope whose turn is open. */
export function script(f: Fixture, house: House, answers: Readonly<{ consciousness: Answer; journey: Answer }>) {
  house.bus.emit(
    effect(
      "kit-set",
      { version: 2, holder: "mind:notas", kit: selectionKit([{ kind: "tool", program: "notas", tool: "personal" }]) },
      "ana",
    ),
  );
  const seen: Seen[] = [];
  f.respond(request => {
    const open = [...house.tools.state().house.minds.turns.values()].find(turn => !turn.closed);
    const journey = open?.opened.process;
    const call = seen.filter(each => each.journey === journey).length + 1;
    const opened = journeyOf(house)?.id;
    const now: Seen = {
      ...(journey ? { journey } : {}),
      ...(opened ? { opened } : {}),
      call,
      changing: request.changing,
      body: request.body,
    };
    seen.push(now);
    const answer = journey ? answers.journey(now) : answers.consciousness(now);
    return "scene" in answer ? answer : { scene: journey ? "Trabajo" : "Miro", consulta: null, acts: answer };
  });
  return seen;
}
/** The journey the consciousness opened, once it exists. */
export const journeyOf = (house: House) => [...house.tools.state().house.journeys.values()][0];
/** The turns of one scope, in order. */
export const turnsOf = (house: House, process?: string) =>
  [...house.tools.state().house.minds.turns.values()].filter(turn => turn.opened.process === process);
