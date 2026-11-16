// Closing one resource must not hide its diagnostic or prevent the remaining resources from closing.
import { OutsideDefect, BaseFailure } from "../../fields/program-call.ts";

export function closeResources(
  stops: readonly (() => void)[],
  report?: (error: unknown) => void,
  failures: unknown[] = [],
): void {
  for (const stop of stops) {
    try {
      stop();
    } catch (error) {
      report?.(error);
      failures.push(error);
    }
  }
  if (failures.length === 1) throw failures[0];
  if (!failures.length) return;
  const error = new AggregateError(failures);
  throw failures.every(failure => failure instanceof OutsideDefect) ? new OutsideDefect(error) : new BaseFailure(error);
}
