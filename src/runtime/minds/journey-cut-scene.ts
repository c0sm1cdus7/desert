// Says in the house scene that a journey turn was cut, without calling a model.
import { effect } from "../../house/facts.ts";
import { sceneLimits } from "../../house/own-acts.ts";
import { journeyCut } from "../../texts/journey.texts.ts";
import { turnNotice } from "../../texts/mind-turn.texts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { TurnOutcome, TurnWake } from "./mind-ports.ts";
import type { MindRuntimeHouse } from "./mind-runtime-options.ts";
/** Cuts by whole code points, so a long goal never leaves half a character in the scene. */
function bounded(text: string, limit: number): string {
  let kept = "";
  for (const point of text) {
    if (kept.length + point.length > limit) break;
    kept += point;
  }
  return kept;
}
/** A journey turn that stopped short leaves its reason in the mind's house scene; nothing retries it. */
export function journeyCutScene<X extends Program>(house: MindRuntimeHouse<X>, wake: TurnWake, outcome: TurnOutcome) {
  const { scope } = wake;
  if (scope.kind !== "journey" || !outcome.reason || !house.active()) return;
  const state = house.execution.state().house;
  const journey = state.journeys.get(scope.process);
  const closed = state.minds.turns.get(wake.id)?.closed;
  if (!journey || !closed) return;
  const reason = turnNotice.text(wake.language, {
    reason: outcome.reason,
    ...(outcome.rejection ? { rejection: outcome.rejection } : {}),
  });
  const general = bounded(journeyCut.text(wake.language, { goal: journey.goal, reason }), sceneLimits.general);
  const to = state.scenes.get(scope.actor)?.data.to ?? {};
  house.execution.bus.emit(effect("scene", { general, to }, scope.actor, [closed.id]));
}
