// Declares the rules and supervisor port without implementing thought or running models.
import type { ProposedAct } from "./mind-answer.ts";
import type { TurnContext, MindScope } from "./mind-contract.ts";
/** `rule`: an act a mechanical rule marks as one that requires supervision; nothing else waits for the supervisor
 * (21/11). Journals keep older reasons in `mind-review-recorded`, which still reads them. */
export type ReviewReason = "rule" | "consultation";
export type ReviewRequest = Readonly<{
  id: string;
  reason: ReviewReason;
  scope: MindScope;
  through: number;
  acts: readonly ProposedAct[];
  question?: string;
  turn?: TurnContext;
  /** Who acts, when it is an identity or anything that is not a mind in a turn: the supervisor judges it alone. */
  by?: string;
}>;
export type ReviewResult = Readonly<{
  proposal: string;
  through: number;
  rulesVersion: string;
  outcome: "passed" | "rejected" | "failed";
  text: string;
}>;
export interface ReviewPort {
  review(request: ReviewRequest): ReviewResult | Promise<ReviewResult>;
}
/** The house supervisor's verdict, in a turn of its own, on an act a rule marks that no mind in a turn proposed. */
export type ActVerdict = (
  request: Readonly<{ id: string; by: string; through: number; act: ProposedAct }>,
) => Promise<ReviewResult>;
