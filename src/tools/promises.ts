// What a program promises of each act: the causes it may refuse with, and cases that say what happens. Specs derive.
import type { Static, TSchema } from "@sinclair/typebox";
import type { Vocabulary } from "../journal/events.ts";
import { toolAct } from "./act-definition.ts";
import type { ActContext, ActResult, Program, Reach, Slices, Tool, ToolAct } from "./tool-contract.ts";

/** Something that already happened before a case: an act of the program, by one of the house's identities. */
export type Step = Readonly<{ act: string; input: unknown; on?: string; by?: string }>;
/** A fact of the program as a case promises it: its kind and everything it says. */
export type Told<X extends Program> = X["fact"] extends infer F
  ? F extends Readonly<{ kind: infer K; data: infer D }>
    ? Readonly<{ kind: K; data: D }>
    : never
  : never;
/** What a case promises happens: the act says something and writes facts, or it is refused with one cause. */
export type Outcome<X extends Program> = Done<X> | Readonly<{ refused: string }>;
/** What the act says and writes; and, when the case promises it, what its tool reads afterwards on a target. */
type Done<X extends Program> = Readonly<{ says: string; facts: readonly Told<X>[] }> &
  Readonly<{ reads?: Readonly<{ on?: string; lines: readonly unknown[] }> }> &
  /** Whom the act calls for attention, when the case promises it: nobody, for what is written only for the record. */
  Readonly<{ calls?: readonly string[] }>;
/** Given this, when someone does this, this happens. Nobody writes its spec: every door's check derives from it. */
export type Case<X extends Program, S extends TSchema = TSchema> = Readonly<{
  promise: string;
  given?: readonly Step[];
  by?: string;
  on?: string;
  input: Static<S>;
  then: Outcome<X>;
}>;
export type ProgramAct<X extends Program> = ToolAct<X> &
  Readonly<{ refuses: readonly string[]; cases: readonly Case<X>[] }>;
export type ProgramTool<X extends Program> = Omit<Tool<X>, "acts"> &
  Readonly<{ acts: Readonly<Record<string, ProgramAct<X>>> }>;
/** A program, whole: what DESERT needs to run it and to check everything it promises. */
export type Composition<X extends Program> = Readonly<{
  words: Vocabulary<X["fact"]>;
  registry: readonly ProgramTool<X>[];
  slices: Slices<X>;
}>;
type Declared<X extends Program, S extends TSchema> = Readonly<{ input: S; reach?: Reach; output?: boolean }> &
  /** Every cause this act may refuse with; refusing with any other is a defect of the program. */
  Readonly<{ refuses?: readonly string[]; offered?: NonNullable<ToolAct<X>["offered"]> }> &
  Readonly<{ run(input: Static<S>, context: ActContext<X>): ActResult<X> | Promise<ActResult<X>> }> &
  /** An act without a case promises nothing: it does not compile. */
  Readonly<{ cases: readonly [Case<X, S>, ...Case<X, S>[]] }>;

/** An act of a program: what it takes, what it does, and what it promises. */
export function programAct<X extends Program, S extends TSchema>(declared: Declared<X, S>): ProgramAct<X> {
  const { input, reach, refuses = [], offered, output, run, cases } = declared;
  const declaredCause = (cause: string): string => {
    if (!refuses.includes(cause)) throw new Error(`An act refused with a cause it does not declare: ${cause}`);
    return cause;
  };
  const checked = (result: ActResult<X>): ActResult<X> => {
    if (result.status === "rejected") declaredCause(result.reason);
    return result;
  };
  const act = toolAct<X, S>(
    input,
    (value, context) => {
      const result = run(value, context);
      return result instanceof Promise ? result.then(checked) : checked(result);
    },
    reach,
  );
  const guarded: ToolAct<X>["offered"] = (state, target) => {
    const cause = offered?.(state, target);
    return cause === undefined ? undefined : declaredCause(cause);
  };
  return { ...act, ...(offered ? { offered: guarded } : {}), ...(output ? { output: true } : {}), refuses, cases };
}
