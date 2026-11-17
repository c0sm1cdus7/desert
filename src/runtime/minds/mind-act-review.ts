// Liga cada revisión a su propuesta, alcance y reglas antes de permitir actos del turno.
import { effect } from "../../house/facts.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { ReviewPort, ReviewRequest, ReviewResult } from "../../tools/minds/mind-review.ts";
import { reviewNotice } from "../../texts/mind-turn.texts.ts";
import { answerConsultation, reviewMindProposal } from "./mind-supervision.ts";
import { TurnStopped, type TurnCaller, type TurnPorts } from "./mind-ports.ts";
export function createMindActReview(ports: TurnPorts, turn: TurnContext, caller: TurnCaller): ReviewPort {
  requireMind(ports, "review.ports");
  requireMind(turn, "review.turn");
  requireMind(caller, "review.caller");
  return {
    review: async request => {
      requireMind(
        request.scope.actor === turn.scope.actor && request.scope.process === turn.scope.process,
        "review.scope",
      );
      const snapshot = ports.read(turn.scope);
      const fixed = { ...request, turn, scope: turn.scope, through: snapshot.through };
      const reviewed =
        request.reason === "consultation"
          ? await answerConsultation(ports.supervision, fixed, caller, snapshot.rulesVersion)
          : await reviewMindProposal(ports.supervision, fixed, caller, snapshot.rulesVersion);
      if (!ports.isOpen(turn.id)) throw new TurnStopped("inactive", turn);
      const current = ports.read(turn.scope);
      const valid =
        current.active &&
        current.rulesVersion === snapshot.rulesVersion &&
        request.acts.every(act => ports.allowed(turn.scope, act));
      const result: ReviewResult = valid
        ? reviewed
        : { ...reviewed, outcome: "failed", text: reviewNotice.text(turn.language, { passed: false }) };
      recordReview(ports, turn, fixed, result);
      return result;
    },
  };
}
export async function reviewMindActs(
  ports: TurnPorts,
  turn: TurnContext,
  review: ReviewPort,
  acts: readonly ProposedAct[],
): Promise<ReviewResult | undefined> {
  let last: ReviewResult | undefined;
  for (const [index, act] of acts.entries()) {
    const reason = ports.reviewReason(turn.scope, act);
    if (!reason) continue;
    const request: ReviewRequest = {
      id: `proposal:${turn.usage.calls}:${index}`,
      reason,
      scope: turn.scope,
      through: ports.read(turn.scope).through,
      acts: [act],
      turn,
    };
    last = await review.review(request);
    if (last.outcome !== "passed") return last;
  }
  return last;
}

function recordReview(ports: TurnPorts, turn: TurnContext, request: ReviewRequest, result: ReviewResult): void {
  ports.emit(
    effect(
      "mind-review-recorded",
      {
        turn: turn.id,
        proposal: request.id,
        acts: request.acts,
        rulesVersion: result.rulesVersion,
        reason: request.reason,
        result: result.outcome,
        text: result.text,
      },
      turn.scope.actor,
      turn.wake,
      turn.scope.process,
    ),
  );
}
