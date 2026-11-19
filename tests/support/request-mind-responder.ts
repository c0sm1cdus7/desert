// Derives synthetic work and replies from native turn causes rather than supplying approved journal facts.
import type { Event } from "../../src/journal/vocabulary.ts";
import { answer, finishWork, history, openWork, type RequestHouse } from "./request-mind-fixture.ts";
export function currentTurn(house: RequestHouse) {
  const turn = [...house.tools.state().house.minds.turns.values()].find(turn => !turn.closed)?.opened;
  if (!turn) throw new Error("turn");
  return turn;
}
export function causalRequest(events: readonly Event[], causes: readonly string[]) {
  const ids = new Set(causes);
  for (const event of [...events].reverse()) {
    if (!ids.has(event.id)) continue;
    if (
      event.layer === "house" &&
      (event.kind === "mind-message" || event.kind === "mind-requested") &&
      event.data.to === "mind:notes"
    )
      return event;
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
      if (event.layer !== "house") throw new Error("wake");
      if (event.kind === "mind-message" || event.kind === "mind-requested") return [openWork(event.data.text)];
      if (event.kind !== "journey-closed") throw new Error("wake.kind");
      const request = causalRequest(events, event.cause);
      return [
        {
          act: "message",
          target: "mind:notes",
          input: {
            to: request.by,
            text: request.data.text,
            ...(request.kind === "mind-message" ? { replyTo: request.id } : {}),
          },
        },
      ];
    }),
  );
}
