// Reconstruye journeys sin cambiar su autor ni volver a abrir un proceso cerrado.
import { migrateKit, type KitMigration } from "../kit-migration.ts";
import { selects, herramientaDe, explicitKit, type KitLayout, type SelectionKit } from "../kit-selection.ts";
import { Value } from "@sinclair/typebox/value";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { HouseEvent } from "../facts.ts";
import type { DelegatedKit } from "../assistants/assistant-facts.ts";
import { journeyFacts } from "./journey-facts.ts";
import { ids } from "../ids.ts";
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
  /** A wait on a notice may have no hour: nothing reads a missing `until` as an hour. */
  waiting?: Readonly<{ what: string; until?: number; on?: "notice" }>;
  /** What the consciousness asked this journey to attend to when it last resumed it. */
  resumed?: string;
  /** The supervisor's last stop and its reason, `frozen` until the consciousness resumes the journey. */
  interrupted?: Readonly<{ reason: string; frozen: boolean }>;
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
    event.kind !== "journey-resumed" &&
    event.kind !== "journey-interrupted" &&
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
  if (event.kind === "journey-interrupted") {
    // Only the supervisor stops a journey, which is not its own; a stopped one is not stopped twice.
    requireMind(event.by === ids.supervisor && previous && !previous.closed, "journey.active");
    requireMind(!journeyFrozen(previous), "journey.interrupted");
    return new Map(state).set(event.process, { ...previous, interrupted: { reason: event.data.reason, frozen: true } });
  }
  requireMind(previous && previous.by === event.by && !previous.closed, "journey.active");
  return new Map(state).set(event.process, advanceJourney(previous, event));
}
function advanceJourney(
  previous: JourneyState,
  event: Exclude<JourneyEvent, HouseEvent<"journey-opened" | "journey-interrupted">>,
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
  if (event.kind === "journey-resumed") {
    const { interrupted } = previous;
    // Resuming clears the stop; the supervisor's reason stays for the journey to read.
    return {
      ...previous,
      resumed: event.data.note,
      ...(interrupted ? { interrupted: { ...interrupted, frozen: false } } : {}),
    };
  }
  return { ...previous, closed: event };
}
/** A journey the supervisor stopped: it runs no turn and no act, and nothing wakes it, until it is resumed. */
export const journeyFrozen = (journey: JourneyState | undefined): boolean => journey?.interrupted?.frozen === true;
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
    !journeyFrozen(journey) &&
    journey.by === by &&
    selects(
      migrateKit(journey.selections ?? explicitKit(journey.kit), migration),
      tool,
      herramientaDe(tool, act, layout),
      act,
    )
  );
}
