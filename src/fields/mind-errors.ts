// Identifies mind-contract rejections without keeping raw answers or private data.
import { mindContractProblem } from "../texts/mind-contracts.texts.ts";
export class MindContractError extends Error {
  readonly field: string;
  constructor(field: string) {
    super(mindContractProblem.text("es", { field }));
    this.field = field;
  }
}
export function requireMind(condition: unknown, field: string): asserts condition {
  if (!condition) throw new MindContractError(field);
}
