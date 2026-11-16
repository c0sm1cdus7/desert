// A calculation stopped before writing must still fail the program's derived purity checks.
import type { Event } from "../journal/events.ts";
import { journalTexts } from "../texts/journal.texts.ts";
export function checkStateInput(event: Event): void {
  if (event.kind !== "tool-entry" || event.layer !== "house") return;
  const detail = event.data.diagnostic ?? "";
  if (/cannot mutate its input state|Method (Map|Set)\.prototype\..*incompatible receiver/.test(detail))
    throw new Error(`${journalTexts.calculationMutated}: ${detail}`);
}
