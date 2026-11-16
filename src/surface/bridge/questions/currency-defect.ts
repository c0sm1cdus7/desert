// A malformed computed currency closes its question, keeping the rest of the tool available.
import { InvalidCurrency } from "../../../fields/currency-symbol.ts";
import { OutsideDefect } from "../../../fields/program-call.ts";
import { entryAdvice } from "../../../texts/entry-advice.ts";
import type { Asking } from "./asking.ts";
export function currencyQuestions(
  next: Asking["next"],
  report: (error: unknown, target?: string) => string,
): Asking["next"] {
  const reported = new Map<string, string>();
  return (answers, target) => {
    try {
      return next(answers, target);
    } catch (error) {
      if (!(error instanceof OutsideDefect) || !(error.detail instanceof InvalidCurrency)) throw error;
      const { source, symbol } = error.detail;
      const key = JSON.stringify([target, source, symbol]);
      let reason = reported.get(key);
      if (reason === undefined) {
        // Reporting emits a house event: a synchronous redraw must not report the same defect recursively.
        reported.set(key, entryAdvice.invalidCurrency(source, JSON.stringify(symbol)));
        reason = report(error, target);
        reported.set(key, reason);
      }
      const detail = `${reason} · ${entryAdvice.invalidCurrency(source, JSON.stringify(symbol))}`;
      return { kind: "pick", ask: source, of: "", found: () => [], shown: value => value, nothing: () => detail };
    }
  };
}
