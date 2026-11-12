// What an act says of what was answered so far, before it runs: why it cannot go on, and which things it takes.
import { Type, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Program, State } from "./tool-contract.ts";

type Answered = Readonly<Record<string, unknown>>;
/** For each tool an act narrows, whether it takes one of its things. */
export type Among = Readonly<Record<string, (thing: string) => boolean>>;
/** Asked after each answer, with the fields answered whole until then. A surface says it early; the act still
 * refuses when run. */
export type SoFar<X extends Program> = Readonly<{
  /** Why what was answered so far cannot go on, when that is so: said at the question it was answered in. */
  stops?: (answered: Answered, state: State<X>, target: string) => string | undefined;
  /** Which things of a tool the act takes: a question that picks among them offers only those, so nothing is on a
   * list to be refused after it was picked. A tool it does not name is offered whole. */
  among?: (answered: Answered, state: State<X>, target: string) => Among;
}>;
/** What an act says of what was answered so far: asked only about the fields it takes, answered whole. Anything
 * else a surface may give is not asked about. */
export function soFar<X extends Program>(input: TSchema, { stops, among }: SoFar<X>): SoFar<X> {
  const partial = Type.Partial(input);
  const asked: NonNullable<SoFar<X>["stops"]> = (answered, state, target) =>
    Value.Check(partial, answered) ? stops?.(answered, state, target) : undefined;
  const narrowed: NonNullable<SoFar<X>["among"]> = (answered, state, target) =>
    Value.Check(partial, answered) ? (among?.(answered, state, target) ?? {}) : {};
  return { ...(stops ? { stops: asked } : {}), ...(among ? { among: narrowed } : {}) };
}
