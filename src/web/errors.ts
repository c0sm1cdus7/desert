import { controllerErrorCodes } from "../messages/error-codes.ts";

// The codes a browser may see are listed once, beside their message keys (src/messages/error-codes.ts).
const exposedErrors: ReadonlySet<string> = new Set(controllerErrorCodes);

/** One normalization policy for the same canonical controller operation across hosts. */
export function controllerErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  return message.startsWith("COMMIT_UNCERTAIN") ? "COMMIT_UNCERTAIN" :
    exposedErrors.has(message) ? message : "CONTROLLER_UNAVAILABLE";
}
