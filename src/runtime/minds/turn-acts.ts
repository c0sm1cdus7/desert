// Applies the acts of one answer in order: a journey hears each result, a consciousness corrects or stops.
import { requireMind } from "../../fields/mind-errors.ts";
import { invalidNotice, type TurnStop } from "../../texts/mind-turn.texts.ts";
import { JourneyKitRefused, JourneyWaitRefused } from "../../tools/minds/journey-controls.ts";
import type { MindAnswer, ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ReviewPort } from "../../tools/minds/mind-review.ts";
import type { ExecuteResult, TurnPorts } from "./mind-ports.ts";
import type { ActReport } from "./turn-results.ts";
export type ActCorrection = Readonly<{ code: "kit" | "wait" | "act"; correction: string }>;
export type AppliedActs = TurnStop | ActCorrection | Readonly<{ reports: readonly ActReport[] }>;
type Run = Readonly<{ ports: TurnPorts; turn: TurnContext; review: ReviewPort }>;
/** A kit or a wait the mind got wrong is its mistake: it comes back as a correction instead of failing the turn. */
async function perform({ ports, turn, review }: Run, act: ProposedAct): Promise<ExecuteResult | ActCorrection> {
  try {
    return await ports.execute(act, { turn, review });
  } catch (error) {
    if (error instanceof JourneyKitRefused)
      return { code: "kit", correction: `${invalidNotice.text(turn.language, { reason: "kit" })} ${error.kit}` };
    if (error instanceof JourneyWaitRefused)
      return { code: "wait", correction: `${invalidNotice.text(turn.language, { reason: "wait" })} ${error.now}` };
    throw error;
  }
}
const reported = (act: ProposedAct, result: ExecuteResult): ActReport => ({
  act,
  status: "accepted",
  ...(result.text ? { text: result.text } : {}),
  ...(result.value === undefined ? {} : { value: result.value }),
});
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
    const result = await perform(run, act);
    if ("code" in result) return result;
    if (result.status === "inconclusive") return "act-uncertain";
    if (result.status === "rejected" && result.reason) {
      // A tool's refusal says why: a consciousness corrects within its budget; a journey sees it among its results
      // and decides, and the acts after it wait for that decision.
      if (turn.scope.kind !== "journey") return { code: "act", correction: result.reason };
      const skipped = answer.acts.slice(index + 1).map((each): ActReport => ({ act: each, status: "skipped" }));
      return { reports: [...reports, { act, status: "rejected", reason: result.reason }, ...skipped] };
    }
    if (result.status !== "accepted") return "act-failed";
    requireMind(result.id && !applied.includes(result.id), "act.id");
    applied.push(result.id);
    reports.push(reported(act, result));
  }
  return { reports };
}
