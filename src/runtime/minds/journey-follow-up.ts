// Keeps an open journey alive: a turn that acted without waiting, ending or desisting gets a short wait.
import { effect } from "../../house/facts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { TurnOutcome, TurnWake } from "./mind-ports.ts";
import type { MindRuntimeHouse } from "./mind-runtime-options.ts";
/** Long enough for a device job to make progress, short enough to report it the same minute. */
export const followUpMs = 90_000;
export function followUpJourney<X extends Program>(house: MindRuntimeHouse<X>, wake: TurnWake, outcome: TurnOutcome) {
  const { scope } = wake;
  if (scope.kind !== "journey" || outcome.outcome !== "done" || !outcome.applied.length || !house.active()) return;
  const journey = house.execution.state().house.journeys.get(scope.process);
  if (!journey || journey.closed) return;
  const opened = house
    .history()
    .find(event => event.layer === "house" && event.kind === "mind-turn-opened" && event.data.turn === wake.id);
  if (!opened) return;
  const later = house.history().filter(event => event.seq > opened.seq && event.process === scope.process);
  if (later.some(event => event.layer === "house" && ["journey-waiting", "journey-closed"].includes(event.kind)))
    return;
  const scene = later.findLast(event => event.layer === "house" && event.kind === "mind-scene");
  const until = house.time.now() + followUpMs;
  const what = scene?.layer === "house" ? scene.data.text : journey.goal;
  const cause = [opened.id];
  house.execution.bus.together(() => {
    house.execution.bus.emit(effect("journey-waiting", { what, until }, scope.actor, cause, scope.process));
    house.execution.bus.emit(effect("wake-at", { id: scope.process, at: until }, scope.actor, cause, scope.process));
  });
}
