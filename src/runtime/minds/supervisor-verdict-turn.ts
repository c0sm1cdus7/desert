// The supervisor's verdict on an identity's marked act, in a turn of its own: opened, billed and closed by it.
import { workingLanguage } from "../../fields/languages.ts";
import { randomUUID } from "node:crypto";
import { effect, type HouseEvent } from "../../house/facts.ts";
import type { HouseEmission } from "../../house/facts.ts";
import { turnLimits, type TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ActVerdict, ReviewRequest, ReviewResult } from "../../tools/minds/mind-review.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { turnNotice, type TurnStop } from "../../texts/mind-turn.texts.ts";
import { supervisorActor } from "./mind-definitions.ts";
import { createTurnCaller, type ModelPort, type TurnCaller } from "./mind-ports.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
import { interruptedCalls } from "./mind-schedule.ts";
type Judge = (
  request: ReviewRequest,
  caller: TurnCaller,
) => Promise<Readonly<{ result: ReviewResult; stop?: TurnStop }>>;
/** Each verdict turn carries the act's id as its process, so it never overlaps the supervisor's own turns or another
 * verdict: the act waits for it as a device act waits for its result. */
export function verdictTurns<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: Pick<MindRuntimeOptions, "rulesVersion">,
  model: ModelPort,
  judge: Judge,
): ActVerdict {
  return async ({ id: act, by, through, act: proposal }) => {
    const turn = verdictTurn(act, through);
    const emit = (kind: HouseEmission) => (house.active() ? house.execution.bus.emit(kind) : undefined);
    const isOpen = () => {
      const opened = house.execution.state().house.minds.turns.get(turn.id);
      return house.active() && !!opened && !opened.closed;
    };
    emit(effect("mind-turn-opened", { turn: turn.id, wake: [act] }, supervisorActor, [act], act));
    const caller = createTurnCaller(model, turn, isOpen);
    const request: ReviewRequest = { id: act, reason: "rule", scope: turn.scope, through, acts: [proposal], turn, by };
    const { result, stop } = await judge(request, caller).catch(() => {
      // The call stopped the turn (the house closed, the twelve calls ran out): the act is not done, and says why.
      const reason = caller.stopped() ?? "internal";
      const text = turnNotice.text(workingLanguage, { reason });
      const failed: ReviewResult = {
        proposal: act,
        through,
        rulesVersion: options.rulesVersion(),
        outcome: "failed",
        text,
      };
      return { result: failed, stop: reason };
    });
    caller.close();
    if (!isOpen()) return { ...result, outcome: "failed" };
    emit(review(turn, request, result));
    emit(closing(turn, caller, caller.stopped() ?? stop, act));
    return result;
  };
}
const verdictTurn = (act: string, through: number): TurnContext => ({
  id: randomUUID(),
  scope: { kind: "consciousness", actor: supervisorActor },
  wake: [act],
  through,
  limits: turnLimits,
  usage: { calls: 0, corrections: 0, consultations: 0 },
});
function closing(turn: TurnContext, caller: TurnCaller, reason: TurnStop | undefined, act: string) {
  let outcome: "done" | "failed" | "interrupted" = "done";
  if (reason) outcome = reason === "uncertain" || reason === "inactive" ? "interrupted" : "failed";
  const data = { turn: turn.id, outcome, calls: caller.calls(), applied: [], ...(reason ? { reason } : {}) };
  return effect("mind-turn-closed", data, supervisorActor, [act], act);
}
const review = (turn: TurnContext, request: ReviewRequest, result: ReviewResult) =>
  effect(
    "mind-review-recorded",
    {
      turn: turn.id,
      proposal: request.id,
      acts: request.acts,
      rulesVersion: result.rulesVersion,
      reason: "rule",
      result: result.outcome,
      text: result.text,
    },
    supervisorActor,
    [request.id],
    request.id,
  );
/** A verdict turn the house's restart cut is closed as interrupted; its act was interrupted with the house. */
export function recoverVerdictTurns<X extends Program>(house: MindRuntimeHouse<X>): void {
  const history = house.history();
  const closed = new Set(
    history.flatMap(e => (e.layer === "house" && e.kind === "mind-turn-closed" ? [e.data.turn] : [])),
  );
  const open = history.filter(
    (e): e is HouseEvent<"mind-turn-opened"> =>
      e.layer === "house" &&
      e.kind === "mind-turn-opened" &&
      e.by === supervisorActor &&
      e.process !== undefined &&
      !closed.has(e.data.turn),
  );
  for (const event of open) {
    const data = {
      turn: event.data.turn,
      outcome: "interrupted",
      calls: interruptedCalls(event, history),
      applied: [],
      reason: "interrupted",
    } as const;
    house.execution.bus.emit(effect("mind-turn-closed", data, supervisorActor, [event.id], event.process));
  }
}
