// One supervisor per house: verdicts on marked acts and answers to consultations, and its own turns woken by facts.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { requireMind } from "../../fields/mind-errors.ts";
import { object } from "../../fields/visible-text.ts";
import { mindText } from "../../house/minds/journey-facts.ts";
import { turnNotice, type TurnStop } from "../../texts/mind-turn.texts.ts";
import { supervisorNotice } from "../../texts/supervisor.texts.ts";
import type { HouseEvent } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import type { ReviewRequest, ReviewResult } from "../../tools/minds/mind-review.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { supervisorActor } from "./mind-definitions.ts";
import type { ModelOutcome, TurnCaller } from "./mind-ports.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
import type { WakePolicy } from "./mind-wake-policy.ts";
import { actingOf, actRules, reviewFrame, ruleLines } from "./supervisor-frame.ts";
import { supervisorWakes } from "./supervisor-wakes.ts";
type Judged = Readonly<{ result: ReviewResult; stop?: TurnStop }>;
const verdict = object({ outcome: Type.Union([Type.Literal("passed"), Type.Literal("rejected")]), text: mindText });
function stopOf(outcome: ModelOutcome): TurnStop {
  if (outcome.kind === "not-sent" || outcome.kind === "failed") return outcome.reason;
  return outcome.kind === "uncertain" ? "uncertain" : "invalid";
}
/** Facts after this one wake it: from its last own turn, never from before the first boot of the latest runs that
 * brought it, so nothing that happened while the house had no supervisor wakes it (older boots say nothing). */
function frontier(history: readonly Event[]): number {
  const own = history.findLast(
    event =>
      event.layer === "house" &&
      event.kind === "mind-turn-opened" &&
      event.by === supervisorActor &&
      event.process === undefined,
  );
  const boots = history.filter(
    (event): event is HouseEvent<"boot"> => event.layer === "house" && event.kind === "boot",
  );
  let first = boots.at(-1);
  for (const boot of boots.toReversed()) {
    if (!boot.data.supervised) break;
    first = boot;
  }
  return Math.max(own?.seq ?? 0, first?.seq ?? history.at(-1)?.seq ?? 0);
}
class Supervisor<X extends Program> {
  readonly since: number;
  readonly house: MindRuntimeHouse<X>;
  readonly options: MindRuntimeOptions;
  constructor(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
    this.house = house;
    this.options = options;
    this.since = frontier(house.history());
  }
  /** A verdict on an act a rule marks, or an answer to a consultation, inside the turn of whoever asks. Every marked
   * act is judged when it comes: nothing is cached, so the same act proposed again is judged again. */
  review = async (request: ReviewRequest, caller: TurnCaller): Promise<ReviewResult> =>
    (await this.judged(request, caller)).result;
  /** The verdict and, when the call gave none, why: the turn that asked closes with that reason. */
  judged = async (request: ReviewRequest, caller: TurnCaller): Promise<Judged> => {
    const { turn } = request;
    requireMind(turn, "review.turn");
    const base = { proposal: request.id, through: request.through, rulesVersion: this.options.rulesVersion() };
    const acts = request.acts.map(act => ({ act, results: actRules(this.house, actingOf(request), act) }));
    const stops = acts.some(each => each.results.some(result => result.outcome === "block"));
    // A mechanical rule that stops the act always wins: the code applies it and the supervisor is not called.
    if (stops && request.reason !== "consultation")
      return {
        result: {
          ...base,
          outcome: "passed",
          text: supervisorNotice.text(turn.language, { kind: "stops", detail: "" }),
        },
      };
    const frame = reviewFrame(this.house, this.options, request, ruleLines(turn.language, acts));
    const outcome = await caller.consult(supervisorActor, frame, verdict);
    if (outcome.kind === "answer" && Value.Check(verdict, outcome.value))
      return { result: { ...base, outcome: outcome.value.outcome, text: outcome.value.text } };
    const stop = stopOf(outcome);
    const detail = turnNotice.text(turn.language, { reason: stop });
    // A marked act the supervisor could not judge is not done; a consultation hears why there was no answer.
    if (request.reason === "rule") return { result: { ...base, outcome: "failed", text: detail }, stop };
    const text = supervisorNotice.text(turn.language, { kind: "unavailable", detail });
    return { result: { ...base, outcome: "passed", text }, stop };
  };
  policy = (message: WakePolicy["message"]): WakePolicy => {
    const policy: WakePolicy = {
      scope: { kind: "consciousness", actor: supervisorActor },
      name: "supervisor",
      message,
      toolOf: () => undefined,
      wakes: event => supervisorWakes(policy, this.since, event),
    };
    return policy;
  };
}
/** Without a card there is no supervisor: the mechanical rules decide and consultations say «sin supervisor». */
export function houseSupervisor<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  return options.supervisorCard ? new Supervisor(house, options) : undefined;
}
