// A mask decides once whether a key fits; its value and its reason use that same decision.
import { entryAdvice } from "../texts/entry/entry-advice.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import type { Mask } from "./contract.ts";

export function maskKeys(
  accept: (typed: string, text: string) => string | undefined,
  reason: (typed: string, text: string) => string,
): Pick<Mask, "put" | "rejected"> {
  return {
    put: (typed, text) => accept(typed, text) ?? typed,
    rejected: (typed, text) => {
      const accepted = accept(typed, text);
      if (typed === "0" && text === "0" && accepted === typed) return entryAdvice.redundantZero;
      return accepted === undefined ? reason(typed, text) : undefined;
    },
  };
}
export const numericKeyReason = (text: string, top: string): string => {
  if (/\s/u.test(text)) return generic.ignored.spaces;
  if (text === "-" || text === "+") return generic.ignored.sign;
  return /^\d+$/u.test(text) ? top : generic.ignored.numbers;
};
