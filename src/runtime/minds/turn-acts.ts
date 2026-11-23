// Applies the acts of one answer in order: a journey hears each result, a consciousness corrects or stops.
import { workingLanguage } from "../../fields/languages.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { journeyPlanRefusal } from "../../texts/journey.texts.ts";
import { invalidNotice, type TurnStop } from "../../texts/mind-turn.texts.ts";
import {
  JourneyKitRefused,
  JourneyNoticeRefused,
  JourneyPlanRefused,
  JourneyStopRefused,
  JourneyWaitRefused,
} from "../../tools/minds/journey-controls.ts";
import type { MindAnswer, ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ReviewPort } from "../../tools/minds/mind-review.ts";
import type { ExecuteResult, TurnPorts } from "./mind-ports.ts";
import type { ActReport } from "./turn-results.ts";
type Refusal = Readonly<{ code: "kit" | "wait" | "plan" | "stopped" | "act"; correction: string }>;
/** A correction carries the results of the acts its answer already applied, so the mind hears what they did. */
type ActCorrection = Refusal & Readonly<{ reports: readonly ActReport[] }>;
type AppliedActs = TurnStop | ActCorrection | Readonly<{ reports: readonly ActReport[] }>;
type Run = Readonly<{ ports: TurnPorts; turn: TurnContext; review: ReviewPort }>;
/** A kit, a wait, its own plan or a second stop the mind got wrong is its mistake: it comes back as a correction
 * instead of failing the turn. */
async function perform({ ports, turn, review }: Run, act: ProposedAct): Promise<ExecuteResult | Refusal> {
  try {
    return await ports.execute(act, { turn, review });
  } catch (error) {
    if (error instanceof JourneyKitRefused)
      return { code: "kit", correction: `${invalidNotice.text(workingLanguage, { reason: "kit" })} ${error.kit}` };
    if (error instanceof JourneyNoticeRefused) {
      const reason = error.retired ? "retired" : "notice";
      return { code: "wait", correction: invalidNotice.text(workingLanguage, { reason }) };
    }
    if (error instanceof JourneyWaitRefused)
      return { code: "wait", correction: `${invalidNotice.text(workingLanguage, { reason: "wait" })} ${error.now}` };
    if (error instanceof JourneyPlanRefused) {
      const { problem, step, pending } = error;
      return { code: "plan", correction: journeyPlanRefusal.text(workingLanguage, { problem, step, pending }) };
    }
    if (error instanceof JourneyStopRefused)
      return {
        code: "stopped",
        correction: `${invalidNotice.text(workingLanguage, { reason: "stopped" })} ${error.goal}`,
      };
    throw error;
  }
}
const reported = (act: ProposedAct, result: ExecuteResult, reason?: string): ActReport => ({
  act,
  status: reason === undefined ? "accepted" : "rejected",
  ...(reason === undefined ? {} : { reason }),
  ...(result.text ? { text: result.text } : {}),
  ...(result.value === undefined ? {} : { value: result.value }),
});
/** The acts after a refused one wait for the mind's decision. */
const skippedAfter = (answer: MindAnswer, index: number) =>
  answer.acts.slice(index + 1).map((each): ActReport => ({ act: each, status: "skipped" }));
function read(ports: TurnPorts, turn: TurnContext, act: ProposedAct): string | undefined {
  const from = typeof act.input === "object" && act.input && "from" in act.input ? act.input.from : 0;
  return ports.page?.(turn, act.target, typeof from === "number" ? from : 0);
}
export async function applyActs(
  run: Run,
  answer: MindAnswer,
  version: string,
  applied: string[],
): Promise<AppliedActs> {
  const { ports, turn } = run;
  const reports: ActReport[] = [];
  for (const [index, act] of answer.acts.entries()) {
    const current = ports.read(turn.scope);
    if (!current.active || !ports.isOpen(turn.id)) return "inactive";
    if (current.rulesVersion !== version) return "review-stale";
    if (!ports.allowed(turn.scope, act)) return "permission";
    // Reading changes nothing in the house: no fact, no review, nothing applied; the text comes with the results.
    const offered = current.menu.find(item => item.act === act.act && item.target === act.target);
    const text = offered?.scope === "read" ? read(ports, turn, act) : undefined;
    if (text !== undefined) {
      reports.push({ act, status: "accepted", page: text });
      continue;
    }
    const result = await perform(run, act);
    if ("code" in result) {
      const corrected: ActReport = { act, status: "rejected", reason: result.correction };
      return { ...result, reports: [...reports, corrected, ...skippedAfter(answer, index)] };
    }
    if (result.status === "inconclusive") return "act-uncertain";
    if (result.status === "rejected" && result.reason) {
      // A tool's refusal says why: a consciousness corrects within its budget; a journey sees it among its results
      // and decides, and the acts after it wait for that decision.
      const told = [...reports, reported(act, result, result.reason), ...skippedAfter(answer, index)];
      if (turn.scope.kind !== "journey") return { code: "act", correction: result.reason, reports: told };
      return { reports: told };
    }
    if (result.status !== "accepted") return "act-failed";
    requireMind(result.id && !applied.includes(result.id), "act.id");
    applied.push(result.id);
    reports.push(reported(act, result));
  }
  return { reports };
}
