// An adapter can supply a deliberate public cause; unknown transport errors never leak their messages.
import { toolTexts } from "../../texts/tools.texts.ts";

export class PortFailure extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super("PortFailure");
    this.reason = reason;
  }
}
export const portReason = (error: unknown): string =>
  error instanceof PortFailure ? error.reason : toolTexts.disconnected;
