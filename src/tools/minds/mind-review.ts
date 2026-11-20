// Declara el puerto de reglas y supervisor sin implementar pensamiento ni ejecutar modelos.
import type { ProposedAct } from "./mind-answer.ts";
import type { TurnContext, MindScope } from "./mind-contract.ts";
/** `rule`: an act a mechanical rule leaves to the supervisor's judgment. */
export type ReviewReason = "open" | "end" | "desist" | "world" | "rule" | "consultation";
export type ReviewRequest = Readonly<{
  id: string;
  reason: ReviewReason;
  scope: MindScope;
  through: number;
  acts: readonly ProposedAct[];
  question?: string;
  turn?: TurnContext;
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
