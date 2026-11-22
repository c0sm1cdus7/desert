// Answers a house supervisor's frames and drives the notes mind through journeys, from the frames the transport saw.
import { expect } from "vitest";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { effect } from "../../src/house/facts.ts";
import { explicitKit, kitLayout } from "../../src/house/kit-selection.ts";
import type { ProposedAct } from "../../src/tools/minds/mind-answer.ts";
import type { ProgramMindResources } from "../../src/runtime/minds/program-mind-options.ts";
import { requestKit, sendKit } from "./request-program.ts";
import { talkKit } from "./talk-program.ts";
import { requestMindFixture, answer, send, history, type RequestHouse } from "./request-mind-fixture.ts";
import { currentTurn, lineOf } from "./request-mind-responder.ts";
import { messageText } from "./frame-text.ts";
export const opus = { model: "claude-opus-5-5", effort: "high" };
/** A request fixture whose house has a supervisor with Opus 5.5, as Void sets it, unless told otherwise. */
export const supervisedFixture = (resources: Partial<ProgramMindResources> = { supervisorCard: opus }) =>
  requestMindFixture(undefined, { capNanoUsd: 10e9, ...resources });
type Fixture = ReturnType<typeof supervisedFixture>;
const asked = Type.Object({ reason: Type.String(), acts: Type.Array(Type.Unknown()), question: Type.Unknown() });
/** What the supervisor was asked for a verdict or a consultation, or nothing for a frame of its own turn. */
export function request(frame: string) {
  const line = frame.split("Pedido:\n")[1]?.split("\n")[0];
  const value: unknown = line ? JSON.parse(line) : undefined;
  return Value.Check(asked, value) ? value : undefined;
}
export const supervising = (frame: string) => frame.startsWith("Alcance:\nmind:supervisor");
const shown = Type.Object({ messages: Type.Array(Type.Object({ content: Type.Unknown() })) });
/** What each model call was shown, in order. */
export const framesOf = (f: Fixture) =>
  f.transport.mock.calls.map(call => {
    const body: unknown = JSON.parse(typeof call[1]?.body === "string" ? call[1].body : "{}");
    return Value.Check(shown, body) ? messageText(body.messages[0]?.content) : "";
  });
/** Every supervisor frame, in order: a verdict's or consultation's reason, or "turn" for a turn of its own. */
export const moments = (frames: readonly string[]) =>
  frames.filter(supervising).map(frame => request(frame)?.reason ?? "turn");
export function withSend(house: RequestHouse) {
  const kit = explicitKit([...requestKit, ...sendKit, talkKit], kitLayout(house.registry));
  house.bus.emit(effect("kit-set", { version: 2, holder: "mind:notes", kit }, "ana"));
}
type Work = (goal: string, frame: string, id: string) => ProposedAct[];
/** The notes mind: it consults once, then opens a journey with the line it heard; its journeys do `work`. */
export function notes(house: RequestHouse, frame: string, work: Work, consult = false) {
  const turn = currentTurn(house);
  if (turn.process) {
    const journey = house.tools.state().house.journeys.get(turn.process);
    if (!journey) throw new Error("journey");
    return answer(work(journey.goal, frame, journey.id));
  }
  const answered = house.tools.state().house.minds.turns.get(turn.data.turn)?.answer;
  const heard = history(house).flatMap(event => (turn.data.wake.includes(event.id) ? (lineOf(event) ?? []) : []));
  if (!heard.length) return answer();
  if (consult && !answered) return { scene: "Dudo", acts: [], consultation: { question: "¿Lo anoto y lo mando?" } };
  const kit = [
    { tool: "notes", acts: [...requestKit.flatMap(each => each.acts), ...sendKit.flatMap(each => each.acts)] },
  ];
  return answer(heard.map(line => ({ act: "open", target: "mind:notes", input: { goal: line.text, kit } })));
}
export const add = (body: string) => ({ act: "personal/add", target: "notes/personal", input: { body } });
export const out = (body: string) => ({ act: "outbox/send", target: "notes/outbox", input: { body } });
export const end = (id: string) => ({ act: "end", target: id, input: { summary: "Hecho", references: [] } });
export const sent = (house: RequestHouse) => history(house).filter(event => event.kind === "notes/sent").length;
export async function think(house: RequestHouse, text: string) {
  expect(send(house, "mind:notes", text).status).toBe("accepted");
  await (await house.minds)?.flush();
}
type Own = (frame: string, turn: number) => readonly ProposedAct[];
/** The supervisor: `review` answers verdicts and consultations; in a turn of its own it writes what it learned and,
 * with `own`, acts (says something, interrupts a journey). */
export function supervisor(review: (reason: string, frame: string) => { outcome: string; text: string }, own?: Own) {
  let learned = 0;
  return (frame: string) => {
    const reason = request(frame)?.reason;
    if (reason) return review(reason, frame);
    learned++;
    return {
      scene: `Aprendí ${learned}: los journeys de notas terminan bien.`,
      consultation: null,
      acts: own?.(frame, learned) ?? [],
    };
  };
}
