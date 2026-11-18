// Reconstruye journeys sin cambiar su autor ni volver a abrir un proceso cerrado.
import { migrateKit, type KitMigration } from "../kit-migration.ts";
import { selects, herramientaDe, explicitKit, type KitLayout, type SelectionKit } from "../kit-selection.ts";
import { Value } from "@sinclair/typebox/value";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { HouseEvent } from "../facts.ts";
import type { DelegatedKit } from "../assistants/assistant-facts.ts";
import { journeyFacts } from "./journey-facts.ts";
export type JourneyPlanStep = Readonly<{ id: string; text: string; note?: string }>;
export type JourneyState = Readonly<{
  id: string;
  by: string;
  goal: string;
  kit: DelegatedKit;
  selections?: SelectionKit;
  opened: string;
  steps: readonly JourneyPlanStep[];
  planned: boolean;
  waiting?: Readonly<{ what: string; until: number }>;
  closed?: HouseEvent<"journey-closed">;
}>;
export type Journeys = ReadonlyMap<string, JourneyState>;
type JourneyEvent = HouseEvent<keyof typeof journeyFacts>;
export function journeyStep(state: Journeys, event: HouseEvent): Journeys {
  if (
    event.kind !== "journey-opened" &&
    event.kind !== "journey-plan-written" &&
    event.kind !== "journey-step-done" &&
    event.kind !== "journey-waiting" &&
    event.kind !== "journey-closed"
  )
    return state;
  requireMind(Value.Check(journeyFacts[event.kind], event.data), event.kind);
  requireMind(parseMindActor(event.by), "journey.by");
  requireMind(event.process && event.process !== event.by, "journey.process");
  const previous = state.get(event.process);
  if (event.kind === "journey-opened") {
    requireMind(!previous, "journey.opened");
    const kit = "version" in event.data ? [] : event.data.kit;
    requireMind(new Set(kit.map(each => each.tool)).size === kit.length, "journey.kit");
    const selections = "version" in event.data ? event.data.kit : explicitKit(kit);
    const next = {
      id: event.process,
      by: event.by,
      goal: event.data.goal,
      kit,
      selections,
      opened: event.id,
      steps: [],
      planned: false,
    };
    return new Map(state).set(event.process, next);
  }
  requireMind(previous && previous.by === event.by && !previous.closed, "journey.active");
  return new Map(state).set(event.process, advanceJourney(previous, event));
}
function advanceJourney(
  previous: JourneyState,
  event: Exclude<JourneyEvent, HouseEvent<"journey-opened">>,
): JourneyState {
  if (event.kind === "journey-plan-written") {
    requireMind(!previous.planned, "journey.plan");
    requireMind(new Set(event.data.steps.map(step => step.id)).size === event.data.steps.length, "journey.steps");
    return { ...previous, planned: true, steps: event.data.steps };
  }
  if (event.kind === "journey-step-done") {
    const step = previous.steps.find(step => step.id === event.data.step);
    requireMind(step && step.note === undefined, "journey.step");
    return {
      ...previous,
      steps: previous.steps.map(step => (step.id === event.data.step ? { ...step, note: event.data.note } : step)),
    };
  }
  if (event.kind === "journey-waiting") return { ...previous, waiting: event.data };
  return { ...previous, closed: event };
}
/** The engine, including nested acts, checks this scope against the current fold. */
export function journeyAllows(
  state: Journeys,
  process: string,
  by: string,
  tool: string,
  act: string,
  layout?: KitLayout,
  migration?: KitMigration,
): boolean {
  const journey = state.get(process);
  return (
    !!journey &&
    !journey.closed &&
    journey.by === by &&
    selects(
      migrateKit(journey.selections ?? explicitKit(journey.kit), migration),
      tool,
      herramientaDe(tool, act, layout),
      act,
    )
  );
}
