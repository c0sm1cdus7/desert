// What an act says of what was answered so far, before it runs: why it cannot go on, and which things it takes.
import { Type, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { toolTexts } from "../texts/tools.texts.ts";
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
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
type Picked = readonly [tool: string, thing: string];
/** Every thing of another tool that an input picks, with the tool it is of: wherever in the input it stands. */
function picksIn(schema: unknown, value: unknown): readonly Picked[] {
  if (!isRecord(schema) || value === undefined || value === null) return [];
  if (typeof schema.of === "string") return typeof value === "string" && value !== "" ? [[schema.of, value]] : [];
  if (Array.isArray(schema.anyOf))
    return picksIn(
      schema.anyOf.find(arm => Value.Check(arm, value)),
      value,
    );
  if (Array.isArray(value)) return value.flatMap(item => picksIn(schema.items, item));
  if (!isRecord(schema.properties) || !isRecord(value)) return [];
  return Object.entries(schema.properties).flatMap(([key, field]) => picksIn(field, value[key]));
}
/** Why an input that says everything cannot go on, by what the act itself said of what is answered so far: what
 * it stops at, or a thing it picks and does not take. A surface says it earlier, at the question; here it is
 * refused through whatever door it came, before the act runs. */
export function refusedWhole<X extends Program>(input: TSchema, said: SoFar<X>, value: unknown) {
  return (state: State<X>, target: string): string | undefined => {
    if (!isRecord(value)) return undefined;
    const stopped = said.stops?.(value, state, target);
    if (stopped !== undefined) return stopped;
    const among = said.among?.(value, state, target) ?? {};
    const left = picksIn(input, value).some(([tool, thing]) => among[tool]?.(thing) === false);
    return left ? toolTexts.notAmong : undefined;
  };
}
