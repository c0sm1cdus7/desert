// Infrastructure failures have their own public code; diagnostics never become public messages.
import { toolTexts } from "../../texts/tools.texts.ts";
import { defectEntry } from "../program-defect.ts";
export function baseEntry(...args: Parameters<typeof defectEntry>) {
  const entry = defectEntry(...args);
  return { ...entry, data: { ...entry.data, text: toolTexts.baseFailure } };
}
/** Called only with scrubbed diagnostics, including the failed attempt to keep them. */
export function lostDiagnostic(entry: unknown, failure: unknown): void {
  console.error(toolTexts.baseFailure, entry, failure);
}
