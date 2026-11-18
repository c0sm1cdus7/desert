// Valida controles de journeys y devuelve sus hechos al turno después de la revisión que corresponda.
import { selectionProblem } from "../../house/kit-validation.ts";
import { expandKit, explicitKit } from "../../house/kit-selection.ts";
import { randomUUID } from "node:crypto";
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { requireMind } from "../../fields/mind-errors.ts";
import { wholeNumber } from "../../fields/json-values.ts";
import { object } from "../../fields/visible-text.ts";
import { mindName } from "../../house/assistants/assistant-facts.ts";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { mindText } from "../../house/minds/journey-facts.ts";
import { journeyStep, type JourneyState } from "../../house/minds/journey-state.ts";
import { deepFreeze } from "../../journal/vocabulary.ts";
import type { TurnContext } from "./mind-contract.ts";
import type { ReviewPort, ReviewRequest, ReviewResult } from "./mind-review.ts";
import {
  journeyInputs,
  journeyPending,
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
  review: ReviewPort;
}>;
export type JourneyReviewOutcome = Readonly<{ review: ReviewResult; facts: readonly HouseEmission[] }>;
const reviewShape = object({
  proposal: mindName,
  through: wholeNumber,
  rulesVersion: mindName,
  text: mindText,
  outcome: Type.Union([Type.Literal("passed"), Type.Literal("rejected"), Type.Literal("failed")]),
});
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
  requireMind(context.review, "review");
  requireMind(typeof context.review.review === "function", "review.review");
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
function ownJourney(context: JourneyControlContext, state: JourneyControlState): JourneyState {
  const scope = context.turn.scope;
  requireMind(scope.kind === "journey", "scope.kind");
  const journey = state.journeys.get(scope.process);
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
async function reviewed(
  context: JourneyControlContext,
  control: "open" | "end" | "desist",
  input: unknown,
  build: (state: JourneyControlState) => readonly HouseEmission[],
): Promise<JourneyReviewOutcome> {
  const before = current(context);
  const rulesVersion = before.rulesVersion;
  build(before);
  const request: ReviewRequest = {
    id: `proposal:${randomUUID()}`,
    reason: control,
    scope: context.turn.scope,
    through: before.through,
    acts: [{ act: control, target: context.turn.scope.process ?? context.turn.scope.actor, input }],
    turn: context.turn,
  };
  deepFreeze(request.acts);
  const result = await context.review.review(request);
  requireMind(Value.Check(reviewShape, result), "review.result");
  requireMind(result.proposal === request.id, "review.proposal");
  requireMind(result.through === request.through, "review.through");
  requireMind(result.rulesVersion === rulesVersion, "review.rulesVersion");
  if (result.outcome !== "passed") return { review: result, facts: [] };
  const after = current(context);
  requireMind(after.through === request.through, "review.through");
  requireMind(after.rulesVersion === result.rulesVersion, "review.rulesVersion");
  return { review: result, facts: build(after) };
}
export async function openJourney(context: JourneyControlContext, input: unknown): Promise<JourneyReviewOutcome> {
  const c = contextOf(context);
  requireMind(c.turn.scope.kind === "consciousness", "scope.kind");
  const data = inputOf(journeyInputs.open, input, "open");
  if (!("version" in data))
    requireMind(new Set(data.kit.map(item => item.tool)).size === data.kit.length, "journey.kit");
  const process = `journey:${randomUUID()}`;
  return reviewed(c, "open", data, state => {
    const registry = state.kit.map(item => ({
      id: item.tool,
      acts: Object.fromEntries(item.acts.map(action => [action, {}])),
      ...(state.layout?.[item.tool] ? { actionTools: state.layout[item.tool] } : {}),
    }));
    if ("version" in data) requireMind(!selectionProblem(data.kit, registry), "journey.kit");
    const kit = "version" in data ? expandKit(data.kit, registry) : data.kit;
    requireMind(
      kit.every(item => item.acts.every(act => kitIncludes(state.kit, item.tool, act))),
      "journey.kit",
    );
    requireMind(
      kit.every(item => state.kit.some(each => each.tool === item.tool)),
      "journey.kit",
    );
    return checked(state, [
      effect(
        "journey-opened",
        { version: 2, goal: data.goal, kit: "version" in data ? data.kit : explicitKit(data.kit, state.layout) },
        c.turn.scope.actor,
        c.cause,
        process,
      ),
    ]);
  });
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
  requireMind(data.until > state.now, "journey.wait.until");
  return checked(state, [
    effect("journey-waiting", data, journey.by, causes(c, journey), journey.id),
    effect("wake-at", { id: journey.id, at: data.until }, journey.by, causes(c, journey), journey.id),
  ]);
}
function closeJourney(
  c: JourneyControlContext,
  control: "end" | "desist",
  input: unknown,
  data: Readonly<{ summary: string; references: readonly string[] }>,
): Promise<JourneyReviewOutcome> {
  return reviewed(c, control, input, state => {
    const journey = ownJourney(c, state);
    requireMind(!journeyPending(c.turn.scope, state), "journey.pending");
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
  });
}
export async function endJourney(context: JourneyControlContext, input: unknown): Promise<JourneyReviewOutcome> {
  const c = contextOf(context);
  const data = inputOf(journeyInputs.end, input, "end");
  return closeJourney(c, "end", data, data);
}
export async function desistJourney(context: JourneyControlContext, input: unknown): Promise<JourneyReviewOutcome> {
  const c = contextOf(context);
  const data = inputOf(journeyInputs.desist, input, "desist");
  return closeJourney(c, "desist", data, { summary: data.reason, references: data.references });
}
