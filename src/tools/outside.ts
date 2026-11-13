// A program's run only succeeds or reports a cause declared as coming from the world.
import type { ActResult, Program } from "./tool-contract.ts";

export type RunResult<X extends Program, O extends readonly string[]> =
  | Extract<ActResult<X>, { status: "accepted" }>
  | Readonly<{ status: "rejected"; reason: O[number] | `${O[number]} · ${string}` }>;
/** A programmer defect must survive the house's conversion of ordinary failures into action results. */
export class OutsideDefect extends Error {
  readonly detail: unknown;
  constructor(detail: unknown) {
    super(`OutsideDefect${detail instanceof Error ? `: ${detail.message}` : ""}`, { cause: detail });
    this.detail = detail;
  }
}
export const outsideCause = (outside: readonly string[], reason: string): string | undefined =>
  outside.find(cause => reason === cause || reason.startsWith(`${cause} · `));

export function outsideRun<X extends Program>(
  outside: readonly string[],
  run: () => ActResult<X> | Promise<ActResult<X>>,
) {
  const check = (result: ActResult<X>): ActResult<X> => {
    if (result.status === "accepted") return result;
    if (result.status !== "rejected" || !outsideCause(outside, result.reason)) throw new OutsideDefect(result);
    return result;
  };
  const failed = (error: unknown): never => {
    throw error instanceof OutsideDefect ? error : new OutsideDefect(error);
  };
  try {
    const result = run();
    return result instanceof Promise ? result.then(check).catch(failed) : check(result);
  } catch (error) {
    return failed(error);
  }
}
