// Revisa propuestas y consultas por puertos ausentes o configurados sin aprobar una falla.
import { Value } from "@sinclair/typebox/value";
import { mindText } from "../../house/minds/journey-facts.ts";
import type { ReviewRequest, ReviewResult } from "../../tools/minds/mind-review.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { noSupervisor, reviewNotice } from "../../texts/mind-turn.texts.ts";
import type { SupervisionPorts, TurnCaller } from "./mind-ports.ts";
function result(request: ReviewRequest, version: string, passed: boolean): ReviewResult {
  requireMind(request.turn, "review.turn");
  return {
    proposal: request.id,
    through: request.through,
    rulesVersion: version,
    outcome: passed ? "passed" : "failed",
    text: reviewNotice.text(request.turn.language, { passed }),
  };
}
function bound(value: ReviewResult, request: ReviewRequest, version: string): ReviewResult {
  const valid =
    value.proposal === request.id &&
    value.through === request.through &&
    value.rulesVersion === version &&
    ["passed", "rejected", "failed"].includes(value.outcome) &&
    Value.Check(mindText, value.text);
  return valid ? value : result(request, version, false);
}
export async function reviewMindProposal(
  ports: SupervisionPorts,
  request: ReviewRequest,
  caller: TurnCaller,
  version: string,
): Promise<ReviewResult> {
  requireMind(ports, "supervision");
  requireMind(request, "review.request");
  requireMind(caller, "review.caller");
  requireMind(request.turn, "review.turn");
  requireMind(typeof version === "string" && version.trim(), "rulesVersion");
  try {
    if (ports.rules) {
      const rules = bound(await ports.rules.review(request), request, version);
      if (rules.outcome !== "passed") return rules;
    }
    if (!ports.supervisor) return result(request, version, true);
    const reviewed = bound(await ports.supervisor(request, caller), request, version);
    return caller.stopped() || caller.pendingInvalid() ? result(request, version, false) : reviewed;
  } catch {
    return result(request, version, false);
  }
}
export async function answerConsultation(
  ports: SupervisionPorts,
  request: ReviewRequest,
  caller: TurnCaller,
  version: string,
): Promise<ReviewResult> {
  requireMind(request, "consultation.request");
  requireMind(request.reason === "consultation" && request.question?.trim(), "consultation.question");
  const reviewed = await reviewMindProposal(ports, request, caller, version);
  if (ports.supervisor || reviewed.outcome !== "passed") return reviewed;
  requireMind(request.turn, "review.turn");
  return { ...reviewed, text: noSupervisor.text(request.turn.language, {}) };
}
