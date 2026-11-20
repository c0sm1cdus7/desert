// Keeps an open journey alive: a turn that acted without waiting, or that was cut short, gets a short wait.
import { effect } from "../../house/facts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { TurnOutcome, TurnWake } from "./mind-ports.ts";
import type { MindRuntimeHouse } from "./mind-runtime-options.ts";
/** Long enough for a device job to make progress, short enough to report it the same minute. */
export const followUpMs = 90_000;
/** Gives the journey a wait after the turn `turn`, unless that turn already left one or closed the journey. */
function waitAfter<X extends Program>(house: MindRuntimeHouse<X>, actor: string, process: string, turn: string) {
  const journey = house.execution.state().house.journeys.get(process);
  if (!journey || journey.closed || journey.by !== actor) return;
  const history = house.history();
  const opened = history.find(
    event => event.layer === "house" && event.kind === "mind-turn-opened" && event.data.turn === turn,
  );
  if (!opened) return;
  const later = history.filter(event => event.seq > opened.seq && event.process === process);
  if (later.some(event => event.layer === "house" && ["journey-waiting", "journey-closed"].includes(event.kind)))
    return;
  const scene = later.findLast(event => event.layer === "house" && event.kind === "mind-scene");
  const until = house.time.now() + followUpMs;
  const what = scene?.layer === "house" ? scene.data.text : journey.goal;
  const cause = [opened.id];
  house.execution.bus.together(() => {
    house.execution.bus.emit(effect("journey-waiting", { what, until }, actor, cause, process));
    house.execution.bus.emit(effect("wake-at", { id: process, at: until }, actor, cause, process));
  });
}
export function followUpJourney<X extends Program>(house: MindRuntimeHouse<X>, wake: TurnWake, outcome: TurnOutcome) {
  const { scope } = wake;
  if (scope.kind !== "journey" || !house.active()) return;
  // A turn cut short did not choose to stop: its journey comes back as one that acted without waiting does.
  const acted = outcome.outcome === "done" && outcome.applied.length > 0;
  if (acted || outcome.outcome === "interrupted") waitAfter(house, scope.actor, scope.process, wake.id);
}
/** A restart closes the turns it cut as interrupted, outside any run: their open journeys get their wait here. */
export function resumeInterruptedJourneys<X extends Program>(house: MindRuntimeHouse<X>): void {
  if (!house.active()) return;
  const history = house.history();
  for (const journey of house.execution.state().house.journeys.values()) {
    if (journey.closed) continue;
    const closed = history.findLast(
      event => event.layer === "house" && event.kind === "mind-turn-closed" && event.process === journey.id,
    );
    if (closed?.layer !== "house" || closed.kind !== "mind-turn-closed" || closed.data.outcome !== "interrupted")
      continue;
    waitAfter(house, journey.by, journey.id, closed.data.turn);
  }
}
