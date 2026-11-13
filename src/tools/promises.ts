// What a program promises of each act: the causes it may refuse with, and cases that say what happens. Specs derive.
import { toolTexts } from "../texts/tools.texts.ts";
import { aid, short, worded } from "./act-words.ts";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { OutsideDefect, type RunResult } from "./outside.ts";
import { soFar } from "./so-far.ts";
import type { ActContext, Program, State, ToolAct } from "./tool-contract.ts";

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
/** The opaque mark keeps an erased registry from admitting a hand-written, unchecked run. */
const declaredBody = Symbol();
const declaredCauses = Symbol();
export type ProgramOutside<O extends readonly string[]> = O & Readonly<{ [declaredCauses]: true }>;
export type ProgramRun<X extends Program, O extends readonly string[]> = ((
  value: unknown,
  context: ActContext<X>,
) => RunResult<X, O> | Promise<RunResult<X, O>>) &
  Readonly<{ [declaredBody]: true }>;
function body<X extends Program, S extends TSchema, O extends readonly string[]>(declared: Declared<X, S, O>) {
  const run = (value: unknown, context: ActContext<X>) => {
    if (!Value.Check(declared.input, value)) throw new OutsideDefect(value);
    return declared.run(value, context);
  };
  return Object.assign(run, { [declaredBody]: true as const });
}
/** What the base itself refuses with is not the act's to declare. */
export const ofTheBase = (cause: string): boolean => cause === toolTexts.unchanged || cause === toolTexts.noSuchDay;
function guarded<X extends Program>(refuses: readonly string[], offered: ToolAct<X>["offered"]) {
  return (state: State<X>, target: string, at: number): string | undefined => {
    const cause = offered?.(state, target, at);
    if (cause !== undefined && !refuses.includes(cause))
      throw new Error(`An act refused with a cause it does not declare: ${cause}`);
    return cause;
  };
}
/** An act of a program: what it takes, what it does, and what it promises. */
export function programAct<X extends Program, S extends TSchema, const O extends readonly string[] = readonly []>(
  declared: Declared<X, S, O>,
): ProgramAct<X, O>;
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
  const said = soFar<X>(input, declared);
  const act = { input, reach: reach ?? "house", run: body(declared) };
  const promised = {
    ...offeredBy(declared),
    refuses,
    outside: Object.assign([...outside], { [declaredCauses]: true as const }),
    cases,
    ...(confirms ? { confirms: summary } : {}),
    ...(today ? { today } : {}),
    ...(also ? { also } : {}),
    ...(datum ? { datum } : {}),
    ...said,
  };
  return {
    ...act,
    ...(offered ? { offered: guarded(refuses, offered) } : {}),
    ...(output ? { output: true } : {}),
    ...promised,
  };
}
