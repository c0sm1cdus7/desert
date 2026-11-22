// Folds the public thread and each turn's consultations, without assignments or economy.
import { Value } from "@sinclair/typebox/value";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { HouseEvent } from "../facts.ts";
import { mindFacts } from "./mind-facts.ts";
export type MindTurn = Readonly<{
  opened: HouseEvent<"mind-turn-opened">;
  invalid: readonly HouseEvent<"mind-answer-invalid">[];
  consultation?: HouseEvent<"mind-consultation-requested">;
  answer?: HouseEvent<"mind-consultation-answered">;
  reviews: readonly HouseEvent<"mind-review-recorded">[];
  closed?: HouseEvent<"mind-turn-closed">;
}>;
export type MindState = Readonly<{
  turns: ReadonlyMap<string, MindTurn>;
  scenes: ReadonlyMap<string, HouseEvent<"mind-scene">>;
}>;
export const emptyMindState: MindState = { turns: new Map(), scenes: new Map() };
function isMindEvent(event: HouseEvent): event is HouseEvent<keyof typeof mindFacts> {
  return Object.hasOwn(mindFacts, event.kind);
}
export function mindStep(state: MindState, event: HouseEvent): MindState {
  if (!isMindEvent(event)) return state;
  requireMind(Value.Check(mindFacts[event.kind], event.data), event.kind);
  requireMind(parseMindActor(event.by), "turn.by");
  const previous = state.turns.get(event.data.turn);
  if (event.kind === "mind-turn-opened") {
    requireMind(!previous, "turn.opened");
    requireMind(
      ![...state.turns.values()].some(
        turn => !turn.closed && turn.opened.by === event.by && turn.opened.process === event.process,
      ),
      "turn.concurrent",
    );
    const next = { opened: event, invalid: [], reviews: [] };
    return { ...state, turns: new Map(state.turns).set(event.data.turn, next) };
  }
  requireMind(
    previous && !previous.closed && previous.opened.by === event.by && previous.opened.process === event.process,
    "turn.active",
  );
  if (event.kind === "mind-scene")
    return { ...state, scenes: new Map(state.scenes).set(event.process ?? event.by, event) };
  // Messages from before 20/11 stay in the journal; minds now talk only through programs.
  if (event.kind === "mind-message") return state;
  return { ...state, turns: new Map(state.turns).set(event.data.turn, advanceTurn(previous, event)) };
}
function advanceTurn(
  previous: MindTurn,
  event: HouseEvent<Exclude<keyof typeof mindFacts, "mind-turn-opened" | "mind-scene" | "mind-message">>,
): MindTurn {
  if (event.kind === "mind-answer-invalid") return { ...previous, invalid: [...previous.invalid, event] };
  if (event.kind === "mind-consultation-requested") {
    requireMind(!previous.consultation, "turn.consultation");
    return { ...previous, consultation: event };
  }
  if (event.kind === "mind-consultation-answered") {
    requireMind(previous.consultation && !previous.answer, "turn.answer");
    return { ...previous, answer: event };
  }
  if (event.kind === "mind-review-recorded") return { ...previous, reviews: [...previous.reviews, event] };
  requireMind(event.data.outcome !== "done" || !previous.consultation || previous.answer, "turn.pending");
  return { ...previous, closed: event };
}
