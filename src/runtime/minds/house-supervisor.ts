// One supervisor per house: a call inside the consulting mind's turn, and its own thread when a journey closes.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { requireMind } from "../../fields/mind-errors.ts";
import { object } from "../../fields/visible-text.ts";
import { effect, type HouseEvent } from "../../house/facts.ts";
import { mindText } from "../../house/minds/journey-facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { turnNotice, type TurnStop } from "../../texts/mind-turn.texts.ts";
import { supervisorNotice } from "../../texts/supervisor.texts.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
import { turnLimits, type TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ReviewRequest, ReviewResult } from "../../tools/minds/mind-review.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { supervisorActor } from "./mind-definitions.ts";
import { createTurnCaller, type ModelOutcome, type TurnCaller } from "./mind-ports.ts";
import type { TurnOutcome, TurnPorts, TurnWake } from "./mind-ports.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
import type { WakePolicy } from "./mind-wake-policy.ts";
import { actRules, learnFrame, reviewFrame, ruleLines } from "./supervisor-frame.ts";
const verdict = object({ outcome: Type.Union([Type.Literal("passed"), Type.Literal("rejected")]), text: mindText });
const lesson = object({ scene: mindText });
/** Keys sorted at every level, so the same act proposed twice in one turn is judged once. */
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  return JSON.stringify(value === undefined ? null : value);
};
function stopOf(outcome: ModelOutcome): TurnStop {
  if (outcome.kind === "not-sent" || outcome.kind === "failed") return outcome.reason;
  return outcome.kind === "uncertain" ? "uncertain" : "invalid";
}
type LearnPorts = Pick<TurnPorts, "model" | "emit" | "isOpen">;
class Supervisor<X extends Program> {
  private readonly verdicts = new WeakMap<TurnContext, Map<string, ReviewResult>>();
  private readonly since: number;
  readonly house: MindRuntimeHouse<X>;
  readonly options: MindRuntimeOptions;
  constructor(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
    this.house = house;
    this.options = options;
    const history = house.history();
    const learned = history.findLast(
      event => event.layer === "house" && event.kind === "mind-turn-opened" && event.by === supervisorActor,
    );
    // A new supervisor learns from what closes from now on; a known one, from what closed since it last woke.
    this.since = learned?.seq ?? history.at(-1)?.seq ?? 0;
  }
  review = async (request: ReviewRequest, caller: TurnCaller): Promise<ReviewResult> => {
    const { turn } = request;
    requireMind(turn, "review.turn");
    const base = { proposal: request.id, through: request.through, rulesVersion: this.options.rulesVersion() };
    const acts = request.acts.map(act => ({ act, results: actRules(this.house, request.scope, act) }));
    const stops = acts.some(each => each.results.some(result => result.outcome === "block"));
    // A mechanical rule that stops the act always wins: the code applies it and the supervisor is not called.
    if (stops && request.reason !== "consultation")
      return { ...base, outcome: "passed", text: supervisorNotice.text(turn.language, { kind: "stops", detail: "" }) };
    const key = stable([request.reason, request.acts]);
    const known = request.reason === "consultation" ? undefined : this.verdicts.get(turn)?.get(key);
    if (known) return { ...known, ...base };
    const frame = reviewFrame(this.house, this.options, request, ruleLines(turn.language, acts));
    const outcome = await caller.consult(supervisorActor, frame, verdict);
    if (outcome.kind !== "answer" || !Value.Check(verdict, outcome.value)) {
      // Without a supervisor the mechanical rules decide: what asks for judgment waits and says so.
      const judgment = acts.some(each => each.results.some(result => result.outcome === "require-supervisor"));
      if (judgment && request.reason !== "consultation")
        return { ...base, outcome: "rejected", text: rulesTexts.waiting };
      const detail = turnNotice.text(turn.language, { reason: stopOf(outcome) });
      return {
        ...base,
        outcome: "passed",
        text: supervisorNotice.text(turn.language, { kind: "unavailable", detail }),
      };
    }
    const result: ReviewResult = { ...base, outcome: outcome.value.outcome, text: outcome.value.text };
    const judged = this.verdicts.get(turn) ?? new Map<string, ReviewResult>();
    if (result.outcome === "passed") this.verdicts.set(turn, judged.set(key, result));
    return result;
  };
  policy = (message: WakePolicy["message"]): WakePolicy => ({
    scope: { kind: "consciousness", actor: supervisorActor },
    name: "supervisor",
    message,
    toolOf: () => undefined,
    wakes: (event: Event) => event.layer === "house" && event.kind === "journey-closed" && event.seq > this.since,
  });
  /** Its own turn: it reads the journeys that closed and writes in its scene what it learned. */
  learn = async (wake: TurnWake, ports: LearnPorts): Promise<TurnOutcome> => {
    const turn: TurnContext = { ...wake, limits: turnLimits, usage: { calls: 0, corrections: 0, consultations: 0 } };
    ports.emit(effect("mind-turn-opened", { turn: wake.id, wake: [...wake.wake] }, supervisorActor, wake.wake));
    const caller = createTurnCaller(ports.model, turn, () => this.house.active() && ports.isOpen(wake.id));
    const closed = this.house
      .history()
      .filter(
        (event): event is HouseEvent<"journey-closed"> =>
          wake.wake.includes(event.id) && event.layer === "house" && event.kind === "journey-closed",
      );
    let answer: ModelOutcome = { kind: "uncertain" };
    try {
      answer = await caller.call(supervisorActor, learnFrame(this.house, this.options, closed), lesson);
    } catch {
      /* The caller already knows why it stopped. */
    }
    caller.close();
    const scene = answer.kind === "answer" && Value.Check(lesson, answer.value) ? answer.value.scene : undefined;
    if (scene) ports.emit(effect("mind-scene", { turn: wake.id, text: scene }, supervisorActor, wake.wake));
    return this.close(wake, ports, scene ? undefined : (caller.stopped() ?? stopOf(answer)), caller.calls());
  };
  private close(wake: TurnWake, ports: LearnPorts, reason: TurnStop | undefined, calls: number): TurnOutcome {
    let outcome: TurnOutcome["outcome"] = "done";
    if (reason) outcome = reason === "uncertain" || reason === "inactive" ? "interrupted" : "failed";
    const data = { turn: wake.id, outcome, calls, applied: [] };
    if (ports.isOpen(wake.id)) ports.emit(effect("mind-turn-closed", data, supervisorActor, wake.wake));
    return { outcome, calls, applied: [], ...(reason ? { reason } : {}) };
  }
}
/** Without a card there is no supervisor: the mechanical rules decide and consultations say «sin supervisor». */
export function houseSupervisor<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  return options.supervisorCard ? new Supervisor(house, options) : undefined;
}
