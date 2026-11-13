// What a program promises of each act: the causes it may refuse with, and cases that say what happens. Specs derive.
import { toolTexts } from "../texts/tools.texts.ts";
import { aid, short, worded } from "./act-words.ts";
import { wrongIn } from "../catalogs/fields.ts";
import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { outsideRun, outsideCause } from "./outside.ts";
import { toolAct } from "./act-definition.ts";
import { refusedWhole, soFar, type SoFar } from "./so-far.ts";
import type { ActContext, ActResult, Program, State, ToolAct } from "./tool-contract.ts";

export type {
  Did,
  Step,
  Told,
  Outcome,
  Need,
  Case,
  Offered,
  Datum,
  Also,
  Menu,
  ProgramAct,
  ProgramTool,
  Composition,
} from "./promises-contract.ts";
import type { Declared, Offered, ProgramAct } from "./promises-contract.ts";

/** Whether an act takes anything at all: an object with a field, or one of several shapes. */
const asksSomething = (input: TSchema): boolean => {
  const fields: unknown = Reflect.get(input, "properties");
  const filled = fields !== null && typeof fields === "object" && Object.keys(fields).length > 0;
  return filled || Array.isArray(Reflect.get(input, "anyOf"));
};
/** How a declared act stands on a surface: its words checked, and only the parts it gave. */
function offeredBy<X extends Program, S extends TSchema, O extends readonly string[]>(
  declared: Declared<X, S, O>,
): Offered {
  const { name, enter, undoable, purpose, key, on, leaves, under, title, changes } = declared;
  const placed = { ...(leaves === undefined ? {} : { leaves }), ...(under === undefined ? {} : { under }) };
  const more = { ...(title ? { title } : {}), ...(changes ? { changes } : {}) };
  return { ...worded({ name, enter }), undoable, purpose: aid(purpose), key, on, ...placed, ...more };
}
/** What an act answers, now or later, passed through a check of it. */
const settled = <R>(result: R | Promise<R>, check: (result: R) => R): R | Promise<R> =>
  result instanceof Promise ? result.then(check) : check(result);
/** What the base itself refuses with is not the act's to declare: nothing would change, or a day does not exist. */
export const ofTheBase = (cause: string): boolean => cause === toolTexts.unchanged || cause === toolTexts.noSuchDay;
/** What a field says is wrong, or the act says cannot go on or does not take, never reaches it, by any door. And
 * an act that says what the thing is today does not leave it as it is: nothing new would be written. */
const heldBy =
  <X extends Program, S extends TSchema, O extends readonly string[]>(
    { input, run, today, refuses = [], outside }: Declared<X, S, O>,
    said: SoFar<X>,
  ): ((value: Static<S>, context: ActContext<X>) => ActResult<X> | Promise<ActResult<X>>) =>
  (value, context) => {
    const whole = refusedWhole(input, said, value);
    const wrong = wrongIn(input, value) ?? whole(context.state, context.target, refuses);
    if (wrong !== undefined) return { status: "rejected", reason: wrong };
    const same = today !== undefined && Value.Equal(today(context.state, context.target), value);
    return same
      ? { status: "rejected", reason: toolTexts.unchanged }
      : outsideRun(outside ?? [], () => run(value, context));
  };
function checks<X extends Program>(
  refuses: readonly string[],
  outside: readonly string[],
  offered?: ToolAct<X>["offered"],
) {
  const declaredCause = (cause: string): string => {
    if (!refuses.includes(cause)) throw new Error(`An act refused with a cause it does not declare: ${cause}`);
    return cause;
  };
  const checked = (result: ActResult<X>): ActResult<X> => {
    if (result.status === "rejected" && !ofTheBase(result.reason) && !outsideCause(outside, result.reason))
      declaredCause(result.reason);
    return result;
  };
  const guarded: ToolAct<X>["offered"] = (state, target, at) => {
    const cause = offered?.(state, target, at);
    return cause === undefined ? undefined : declaredCause(cause);
  };
  return { checked, guarded };
}
/** An act of a program: what it takes, what it does, and what it promises. */
export function programAct<X extends Program, S extends TSchema, const O extends readonly string[] = readonly []>(
  declared: Declared<X, S, O>,
): ProgramAct<X> {
  const { input, reach, refuses = [], outside = [], offered, output, cases, confirms, today, also, datum } = declared;
  [...refuses, ...outside].forEach(short);
  /** What cannot be undone asks to be confirmed. With nothing to ask, the surface asks by itself; with something,
   * the act says what is put before the person. */
  if (!declared.undoable && !confirms && asksSomething(input))
    throw new Error(
      `An act that cannot be undone asks to be confirmed, and this one does not say what with: ${declared.name}`,
    );
  const summary = (value: unknown, state: State<X>, target: string, at: number): string | undefined =>
    Value.Check(input, value) ? confirms?.(value, state, target, at) : undefined;
  const { checked, guarded } = checks<X>(refuses, outside, offered);
  const said = soFar<X>(input, declared);
  const held = heldBy(declared, said);
  const act = toolAct<X, S>(input, (value, context) => settled(held(value, context), checked), reach);
  const promised = {
    ...offeredBy(declared),
    refuses,
    outside,
    cases,
    ...(confirms ? { confirms: summary } : {}),
    ...(today ? { today } : {}),
    ...(also ? { also } : {}),
    ...(datum ? { datum } : {}),
    ...said,
  };
  return { ...act, ...(offered ? { offered: guarded } : {}), ...(output ? { output: true } : {}), ...promised };
}
