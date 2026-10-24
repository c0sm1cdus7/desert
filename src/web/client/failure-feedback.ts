// The feedback a person reads when an operation fails: every sentence is a key of the SDK catalog (plan §14). A code a person
// can see reads `errors.<CODE>`; any other code reads as the controller being unavailable, as the controller normalizes it.
import { rendererLocale } from "../../messages/renderer-locale.ts";
import { Messages, m } from "../../messages/keys.ts";
import { errorMessageKey, surfaceErrorCodes, type SurfaceErrorCode } from "../../messages/error-codes.ts";

const bundle = Messages.bundle(rendererLocale);
const surfaceCodes: ReadonlySet<string> = new Set(surfaceErrorCodes);
const isSurfaceCode = (code: string): code is SurfaceErrorCode => surfaceCodes.has(code);

export function failureFeedback(code: string | null, uncertain = false) {
  if (uncertain) return { title: bundle.text(m.feedback.uncertain.title), description: bundle.text(m.feedback.uncertain.description) };
  if (code === "READ_REFRESH_FAILED") return { title: bundle.text(m.feedback.refreshFailed.title), description: bundle.text(m.errors.READ_REFRESH_FAILED) };
  return { title: bundle.text(m.feedback.failed.title), description: code
    ? bundle.text({ key: errorMessageKey(isSurfaceCode(code) ? code : "CONTROLLER_UNAVAILABLE") })
    : "" };
}
