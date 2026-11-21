// Encauza propuestas por los controles centrales de journeys o por el motor con autor y revisión del turno.
import { ruleControl } from "./rule-controls.ts";
import { applyProgramCommunication } from "./program-mind-communication.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { execute, type Decision } from "../../tools/execute.ts";
import {
  openJourney,
  endJourney,
  desistJourney,
  writeJourneyPlan,
  completeJourneyStep,
  waitJourney,
  resumeJourney,
  type JourneyControlContext,
  type JourneyControlState,
} from "../../tools/minds/journey-controls.ts";
import type { ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { ExecuteResult, TurnPorts } from "./mind-ports.ts";
import {
  supervised,
  type MindRuntimeHouse,
  type MindRuntimeOptions,
  type MindSwitches,
} from "./mind-runtime-options.ts";
import { runtimeView } from "./mind-runtime-view.ts";
import { definitionOf } from "./mind-definitions.ts";
type Context = Parameters<TurnPorts["execute"]>[1];
function controlContext<X extends Program>(
  house: MindRuntimeHouse<X>,
  context: Context,
  cause: readonly string[],
  read: () => JourneyControlState,
): JourneyControlContext {
  const { turn, review } = context;
  let reviewedAt: number | undefined;
  let recordedThrough: number | undefined;
  return {
    turn,
    cause,
    state: () => {
      const state = read();
      return reviewedAt !== undefined && state.through === recordedThrough ? { ...state, through: reviewedAt } : state;
    },
    review: {
      review: async request => {
        const result = await review.review(request);
        const arrivals = house.history().filter(event => event.seq > request.through);
        if (
          arrivals.every(
            event =>
              event.layer === "house" &&
              event.kind === "mind-review-recorded" &&
              event.by === turn.scope.actor &&
              event.data.turn === turn.id &&
              event.data.proposal === request.id,
          )
        ) {
          reviewedAt = request.through;
          recordedThrough = read().through;
        }
        return result;
      },
    },
  };
}
async function controlFacts(context: JourneyControlContext, { act, input, target }: ProposedAct) {
  if (act === "open") return (await openJourney(context, input)).facts;
  if (act === "end") return (await endJourney(context, input)).facts;
  if (act === "desist") return (await desistJourney(context, input, target)).facts;
  if (act === "resume") return resumeJourney(context, input, target);
  if (act === "plan") return writeJourneyPlan(context, input);
  if (act === "done") return completeJourneyStep(context, input);
  if (act === "wait") return waitJourney(context, input);
  return [];
}
/** Opening, ending and desisting always pass by the supervisor, so with one they never wait on a rule's judgment. */
async function applyControl<X extends Program>(
  house: MindRuntimeHouse<X>,
  context: JourneyControlContext,
  proposal: ProposedAct,
  supervised: boolean,
) {
  const judge = supervised && ["open", "end", "desist"].includes(proposal.act);
  if (!ruleControl(house, context.turn.scope, context.cause, proposal, "journey", judge))
    return { status: "rejected" as const, id: context.turn.id };
  const facts = await controlFacts(context, proposal);
  if (!ruleControl(house, context.turn.scope, context.cause, proposal, "journey", judge))
    return { status: "rejected" as const, id: context.turn.id };
  if (!facts.length || !house.active()) return { status: "rejected" as const, id: context.turn.id };
  const events = house.execution.bus.together(() => facts.map(fact => house.execution.bus.emit(fact)));
  const id = events[0]?.id;
  requireMind(id, "runtime.control");
  return { status: "accepted" as const, id };
}
/** What a device act returned, accepted or rejected, is its receipt, which the device dispatch already scrubbed. A
 * house act's value stays with the code that asked for it. */
const receipt = <X extends Program>(done: Decision<X>, device: boolean) =>
  device && done.value !== undefined ? { value: done.value } : {};
/** What an accepted act returned reaches a journey with its results: its line, and a device's receipt. */
function acceptedResult<X extends Program>(done: Decision<X>, id: string, device: boolean): ExecuteResult {
  const text = done.effects.flatMap(each =>
    each.layer === "house" && each.kind === "act-done" ? [each.data.text] : [],
  )[0];
  return { status: "accepted", id, ...(text ? { text } : {}), ...receipt(done, device) };
}
async function applyAct<X extends Program>(
  house: MindRuntimeHouse<X>,
  context: Context,
  proposal: ProposedAct,
  cause: readonly string[],
  judge: boolean,
): ReturnType<TurnPorts["execute"]> {
  const { turn, review } = context;
  const before = house.execution.state().through;
  const result = execute(
    { ...house.execution, mindScope: turn.scope, review, judge },
    proposal,
    before,
    turn.scope.actor,
    cause,
  );
  const done = result.status === "processing" ? await result.completion : result;
  if (!house.active() && done.status !== "inconclusive") return { status: "interrupted", id: turn.id };
  const origin = house
    .history()
    .find(
      event =>
        event.seq > before &&
        event.layer === "house" &&
        event.kind === "act" &&
        cause.every(id => event.cause.includes(id)),
    );
  const status = done.status === "interrupted" || done.status === "inconclusive" ? done.status : "rejected";
  const id = origin?.id ?? turn.id;
  // Only the tool's own refusal teaches the mind something; a rule or the core stays a stop.
  const taught = done.status === "rejected" && !("coreFailure" in done && done.coreFailure);
  const device = proposal.destination?.kind === "device";
  if (taught) return { status, id, ...(done.reason ? { reason: done.reason } : {}), ...receipt(done, device) };
  if (done.status !== "accepted") return { status, id };
  return acceptedResult(done, id, device);
}
export function runtimeActions<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  switches: MindSwitches,
): TurnPorts["execute"] {
  return async (proposal, context) => {
    const { turn } = context;
    const definition = definitionOf(options, house.execution.state().house, turn.scope.actor);
    requireMind(definition, "runtime.definition");
    const view = () => runtimeView(house, options, switches, turn.scope, definition);
    if (!house.active()) return { status: "interrupted", id: turn.id };
    const item = view().menu.find(item => item.act === proposal.act && item.target === proposal.target);
    if (!item) return { status: "rejected", id: turn.id };
    const opened = house.execution.state().house.minds.turns.get(turn.id)?.opened;
    requireMind(opened, "runtime.turn");
    const cause = [opened.id];
    if (item.tool === "mind") {
      if (!ruleControl(house, turn.scope, cause, proposal, "mind")) return { status: "rejected", id: turn.id };
      const event = applyProgramCommunication(house, proposal, turn.scope, options.language);
      return { status: event ? "accepted" : "rejected", id: event?.id ?? turn.id };
    }
    if (item.scope === "control" || item.scope === "open")
      return applyControl(
        house,
        controlContext(house, context, cause, () => view().control),
        proposal,
        supervised(options),
      );
    return applyAct(house, context, proposal, cause, supervised(options));
  };
}
