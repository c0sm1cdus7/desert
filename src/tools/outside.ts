// A program's run only succeeds or reports a cause declared as coming from the world.
import type { ActResult, Program } from "./tool-contract.ts";
import { OutsideDefect } from "../fields/program-call.ts";
import { meant, type Text } from "../fields/phrases.ts";
/** A run succeeds, or reports a cause from the world, and only when its act declares causes from the world. */
export type RunResult<X extends Program, O extends readonly Text[] = readonly Text[]> =
  | Extract<ActResult<X>, { status: "accepted" }>
  | Readonly<{ status: "rejected"; value?: unknown; reason: WorldSaid<O[number]> }>;
/** A declared cause as the world says it: the cause itself, or, said in one language, followed by what it adds. */
type WorldSaid<C extends Text> = C extends string ? C | `${C} · ${string}` : C;
/** The declared cause a refusal from the world says, alone or followed by what the world said: by its English. */
export const outsideCause = (outside: readonly Text[], reason: Text): Text | undefined =>
  outside.find(cause => meant(reason) === meant(cause) || meant(reason).startsWith(`${meant(cause)} · `));

export function outsideRun<X extends Program>(
  outside: readonly Text[],
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
