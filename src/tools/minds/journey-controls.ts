// Valida controles de journeys y devuelve sus hechos al turno; ninguno espera al supervisor.
import { selectionProblem } from "../../house/kit-validation.ts";
import { expandKit, explicitKit } from "../../house/kit-selection.ts";
import { randomUUID } from "node:crypto";
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { requireMind } from "../../fields/mind-errors.ts";
import { wholeNumber } from "../../fields/json-values.ts";
import { mindName } from "../../house/assistants/assistant-facts.ts";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { journeyFrozen, journeyStep, type JourneyState } from "../../house/minds/journey-state.ts";
import { ids } from "../../house/ids.ts";
import { deepFreeze } from "../../journal/vocabulary.ts";
import type { TurnContext } from "./mind-contract.ts";
import {
  journeyInputs,
  pendingIn,
  kitIncludes,
  validateJourneyAccess,
  type JourneyAccess,
  type JourneyControl,
} from "./journey-menu.ts";
export type JourneyControlState = JourneyAccess & Readonly<{ through: number; now: number; rulesVersion: string }>;
/** The turn serializes a process and applies each returned batch atomically before running the next control. */
export type JourneyControlContext = Readonly<{
  turn: TurnContext;
  cause: readonly string[];
  state(): JourneyControlState;
}>;
/** A journey kit outside the mind's own kit is the model's mistake: the turn corrects it instead of failing. */
export class JourneyKitRefused extends Error {
  readonly kit: string;
  constructor(kit: JourneyAccess["kit"]) {
    const listed = kit.map(item => `${item.tool}: ${item.acts.join(", ")}`).join(" · ");
    super("journey.kit");
    this.name = "JourneyKitRefused";
    this.kit = listed;
  }
}
/** A journey the supervisor already stopped is not stopped twice: the turn corrects it, naming the journey. */
export class JourneyStopRefused extends Error {
  readonly goal: string;
  constructor(goal: string) {
    super("journey.interrupted");
    this.name = "JourneyStopRefused";
    this.goal = goal;
  }
}
/** A wait that ends before now is the model's mistake: the turn corrects it with the house clock. */
export class JourneyWaitRefused extends Error {
  readonly now: string;
  constructor(now: number) {
    super("journey.wait.until");
    this.name = "JourneyWaitRefused";
    this.now = `${now} (${new Date(now).toISOString()})`;
  }
}
function inputOf<T extends TSchema>(schema: T, input: unknown, control: JourneyControl): Static<T> {
  const diagnostic =
    control === "open"
      ? journeyInputs.open.anyOf[typeof input === "object" && input && "version" in input ? 1 : 0]
      : schema;
  if (!Value.Check(schema, input)) {
    const error = Value.Errors(diagnostic, input).First();
    requireMind(false, `journey.${control}.input${error?.path ?? ""}`);
  }
  const copy = structuredClone(input);
  deepFreeze(copy);
  return copy;
}
function contextOf(context: JourneyControlContext): JourneyControlContext {
  requireMind(context, "context");
  requireMind(context.turn, "turn");
  requireMind(Value.Check(mindName, context.turn.id), "turn.id");
  requireMind(Value.Check(Type.Literal("es"), context.turn.language), "turn.language");
  requireMind(Value.Check(Type.Array(mindName, { uniqueItems: true }), context.cause), "cause");
  requireMind(typeof context.state === "function", "state");
  validateJourneyAccess(context.turn.scope, context.state());
  const scope = structuredClone(context.turn.scope);
  deepFreeze(scope);
  return { ...context, cause: [...context.cause], turn: { ...context.turn, scope } };
}
function current(context: JourneyControlContext): JourneyControlState {
  const state = context.state();
  validateJourneyAccess(context.turn.scope, state);
  requireMind(state.active, "journey.active");
  requireMind(Value.Check(wholeNumber, state.through), "state.through");
  requireMind(Value.Check(wholeNumber, state.now), "state.now");
  requireMind(Value.Check(mindName, state.rulesVersion), "state.rulesVersion");
  return state;
}
/** A journey acts on itself; a consciousness acts on the open journey of its own that the act names. */
function ownJourney(context: JourneyControlContext, state: JourneyControlState, target?: string): JourneyState {
  const scope = context.turn.scope;
  const id = scope.kind === "journey" ? scope.process : target;
  requireMind(id, "journey.target");
  const journey = state.journeys.get(id);
  requireMind(journey && journey.by === scope.actor && !journey.closed, "journey.active");
  return journey;
}
/** Reuse the existing fold for plan uniqueness, pending steps and all journey transition invariants. */
function checked(state: JourneyControlState, facts: readonly HouseEmission[]): readonly HouseEmission[] {
  let journeys = state.journeys;
  facts.forEach((fact, index) => {
    journeys = journeyStep(journeys, { ...fact, id: randomUUID(), seq: state.through + index + 1, at: state.now });
  });
  return facts;
}
const causes = (context: JourneyControlContext, journey: JourneyState): readonly string[] => [
  ...new Set([...context.cause, journey.opened]),
];
export function openJourney(context: JourneyControlContext, input: unknown): readonly HouseEmission[] {
  const c = contextOf(context);
  requireMind(c.turn.scope.kind === "consciousness", "scope.kind");
  const data = inputOf(journeyInputs.open, input, "open");
  const process = `journey:${randomUUID()}`;
  const open = (state: JourneyControlState) => {
    const refuse = (valid: boolean) => {
      if (!valid) throw new JourneyKitRefused(state.kit);
    };
    if (!("version" in data)) refuse(new Set(data.kit.map(item => item.tool)).size === data.kit.length);
    const registry = state.kit.map(item => ({
      id: item.tool,
      acts: Object.fromEntries(item.acts.map(action => [action, {}])),
      ...(state.layout?.[item.tool] ? { actionTools: state.layout[item.tool] } : {}),
    }));
    if ("version" in data) refuse(!selectionProblem(data.kit, registry));
    const kit = "version" in data ? expandKit(data.kit, registry) : data.kit;
    refuse(kit.every(item => item.acts.every(act => kitIncludes(state.kit, item.tool, act))));
    refuse(kit.every(item => state.kit.some(each => each.tool === item.tool)));
    return checked(state, [
      effect(
        "journey-opened",
        { version: 2, goal: data.goal, kit: "version" in data ? data.kit : explicitKit(data.kit, state.layout) },
        c.turn.scope.actor,
        c.cause,
        process,
      ),
    ]);
  };
  return open(current(c));
}
export function writeJourneyPlan(context: JourneyControlContext, input: unknown): readonly HouseEmission[] {
  const c = contextOf(context);
  const state = current(c);
  const journey = ownJourney(c, state);
  const data = inputOf(journeyInputs.plan, input, "plan");
  return checked(state, [effect("journey-plan-written", data, journey.by, causes(c, journey), journey.id)]);
}
export function completeJourneyStep(context: JourneyControlContext, input: unknown): readonly HouseEmission[] {
  const c = contextOf(context);
  const state = current(c);
  const journey = ownJourney(c, state);
  const data = inputOf(journeyInputs.done, input, "done");
  return checked(state, [effect("journey-step-done", data, journey.by, causes(c, journey), journey.id)]);
}
export function waitJourney(context: JourneyControlContext, input: unknown): readonly HouseEmission[] {
  const c = contextOf(context);
  const state = current(c);
  const journey = ownJourney(c, state);
  const data = inputOf(journeyInputs.wait, input, "wait");
  if (data.until <= state.now) throw new JourneyWaitRefused(state.now);
  return checked(state, [
    effect("journey-waiting", data, journey.by, causes(c, journey), journey.id),
    effect("wake-at", { id: journey.id, at: data.until }, journey.by, causes(c, journey), journey.id),
  ]);
}
function closeJourney(
  c: JourneyControlContext,
  control: "end" | "desist",
  data: Readonly<{ summary: string; references: readonly string[] }>,
  target?: string,
): readonly HouseEmission[] {
  const close = (state: JourneyControlState) => {
    const journey = ownJourney(c, state, target);
    requireMind(!pendingIn(state, journey.by, journey.id), "journey.pending");
    const facts: HouseEmission[] = [
      effect(
        "journey-closed",
        {
          ...data,
          outcome: control === "end" ? "done" : "desisted",
        },
        journey.by,
        causes(c, journey),
        journey.id,
      ),
    ];
    if (journey.waiting)
      facts.push(effect("wake-at", { id: journey.id, at: null }, journey.by, causes(c, journey), journey.id));
    return checked(state, facts);
  };
  return close(current(c));
}
export function endJourney(context: JourneyControlContext, input: unknown): readonly HouseEmission[] {
  const c = contextOf(context);
  requireMind(c.turn.scope.kind === "journey", "scope.kind");
  const data = inputOf(journeyInputs.end, input, "end");
  return closeJourney(c, "end", data);
}
/** A journey desists from itself; its consciousness desists from one of its open journeys, named by `target`. */
export function desistJourney(
  context: JourneyControlContext,
  input: unknown,
  target?: string,
): readonly HouseEmission[] {
  const c = contextOf(context);
  const data = inputOf(journeyInputs.desist, input, "desist");
  return closeJourney(c, "desist", { summary: data.reason, references: data.references }, target);
}
/** The consciousness goes back to one of its open journeys: the fact wakes that journey, with the note to attend. */
export function resumeJourney(
  context: JourneyControlContext,
  input: unknown,
  target: string,
): readonly HouseEmission[] {
  const c = contextOf(context);
  requireMind(c.turn.scope.kind === "consciousness", "scope.kind");
  const state = current(c);
  const journey = ownJourney(c, state, target);
  const data = inputOf(journeyInputs.resume, input, "resume");
  return checked(state, [effect("journey-resumed", data, journey.by, causes(c, journey), journey.id)]);
}
/** The house supervisor stops an open journey of any mind with its reason; one already stopped is refused. */
export function interruptJourney(
  context: JourneyControlContext,
  input: unknown,
  target: string,
): readonly HouseEmission[] {
  const c = contextOf(context);
  requireMind(c.turn.scope.kind === "consciousness" && c.turn.scope.actor === ids.supervisor, "scope.actor");
  const state = current(c);
  const journey = state.journeys.get(target);
  requireMind(journey && !journey.closed, "journey.active");
  const data = inputOf(journeyInputs.interrupt, input, "interrupt");
  if (journeyFrozen(journey)) throw new JourneyStopRefused(journey.goal);
  return checked(state, [effect("journey-interrupted", data, c.turn.scope.actor, causes(c, journey), journey.id)]);
}
