import { promiseTexts as said } from "../../texts/promises.texts.ts";
// An unavailable inspection capability is neither a program failure nor an external refusal.
import { OutsideDefect } from "../outside.ts";
import { BaseFailure } from "./base-failure.ts";
export class InspectionUnavailable extends Error {
  readonly code = "E-CUSTODY-DENIED";
  readonly reason: string;
  constructor(reason: string) {
    super(said.inspectionDenied(reason));
    this.name = "InspectionUnavailable";
    this.reason = reason;
  }
}
/** Only the base's callback wrappers preserve this identity; matching a message or code is never enough. */
export function inspectionUnavailable(error: unknown): InspectionUnavailable | undefined {
  if (error instanceof InspectionUnavailable) return error;
  if (error instanceof OutsideDefect || error instanceof BaseFailure) return inspectionUnavailable(error.detail);
  return undefined;
}
export function requireAvailable(error: unknown): void {
  const unavailable = inspectionUnavailable(error);
  if (unavailable) throw unavailable;
}
