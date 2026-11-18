// Live cancellation belongs to the listener, never to a replayed projection.
import { journeyAllows } from "../../house/minds/journey-state.ts";
import { coreSelf } from "./effect-authority.ts";
import { allowedAct, present } from "../../house/kit.ts";
import { houseStep, type House } from "../../house/members.ts";
import { effect, type HouseEvent } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Decision, Execution } from "../execute.ts";
import type { Program, Reach, State } from "../tool-contract.ts";
export type RunningAct = {
  controller: AbortController;
  origin?: HouseEvent<"act">;
  tool?: string;
  reach?: Reach;
  writing: boolean;
  closed?: boolean;
};
/** The scope exists before capabilities are lent; the accepted act pins its identity before it starts. */
export function runningSignal<X extends Program>(
  ports: Execution<X>,
  origin: HouseEvent<"act">,
  tool: string | undefined,
  reach: Reach,
): AbortSignal | undefined {
  const active = ports.active;
  if (!active) return undefined;
  Object.assign(active, { origin, tool, reach });
  ports.running?.set(origin.id, active);
  return active.controller.signal;
}
function withdrawn<X extends Program>(ports: Execution<X>, active: RunningAct, house = ports.state().house): boolean {
  const { origin, tool } = active;
  if (active.controller.signal.aborted) return true;
  if (!origin || !tool) return false;
  if (house.identities && coreSelf(tool, origin.by, origin.data.object))
    return !present(ports.registry, house, origin.by);
  if (
    origin.process &&
    house.journeys.has(origin.process) &&
    !journeyAllows(
      house.journeys,
      origin.process,
      origin.by,
      tool,
      origin.data.option,
      house.kitLayout,
      house.kitMigration,
    )
  )
    return true;
  return !allowedAct(house, origin.by, tool, origin.data.option, ports.registry);
}
/** Each heard removal sees the current folded house; a later grant cannot unabort this particular act. */
function cutRunning<X extends Program>(ports: Execution<X>, event: Event, house: House): void {
  if (event.layer !== "house") return;
  for (const id of ports.state().processing.keys()) {
    const active = ports.running?.get(id);
    if (active && withdrawn(ports, active, house)) active.controller.abort(toolTexts.withdrawn);
  }
}
/** Queued writes may already be folded ahead of delivery: observe each entitlement transition in journal order. */
export function watchRunning<X extends Program>(ports: Execution<X>) {
  let house = ports.state().house;
  return (event: Event) => {
    house = houseStep(house, event);
    cutRunning(ports, event, house);
  };
}
/** An act that had started when the house stopped never got its result: on boot it is closed as interrupted. */
export function interrupt<X extends Program>({ bus }: Execution<X>, state: State<X>): void {
  for (const [act, started] of state.processing) {
    const data = { act, status: "interrupted" as const, reason: toolTexts.interrupted };
    bus.emit(effect("act-result", data, started.by, [act], started.process));
  }
}
/** Once writing starts the atomic batch stands. A successful world act reports what already happened outside. */
export function cutDecision<X extends Program>(ports: Execution<X>, decision: Decision<X>): Decision<X> {
  const active = ports.active;
  if (!active || !withdrawn(ports, active)) return decision;
  if (active.writing || (active.reach === "world" && decision.status === "accepted"))
    return { ...decision, reason: toolTexts.withdrawn };
  return {
    status: "interrupted",
    reason: toolTexts.withdrawn,
    effects: decision.defect ? decision.effects : [],
    ...(decision.defect ? { defect: true } : {}),
    ...(decision.cleanupPending ? { cleanupPending: true } : {}),
    ...(decision.anchorPending ? { anchorPending: true } : {}),
  };
}
