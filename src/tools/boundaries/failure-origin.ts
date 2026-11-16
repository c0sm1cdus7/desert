// The bus groups listeners' exceptions; grouping them must not erase the origin each callback marked.
import { OutsideDefect } from "../../fields/program-call.ts";
export function failureOrigin(error: unknown): unknown {
  if (!(error instanceof AggregateError)) return error;
  const failures: readonly unknown[] = error.errors;
  return failures.length && failures.every(failure => failureOrigin(failure) instanceof OutsideDefect)
    ? new OutsideDefect(error)
    : error;
}
