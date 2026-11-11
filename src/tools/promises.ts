// What a program promises of each act: the causes it may refuse with, and cases that say what happens. Specs derive.
import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Vocabulary } from "../journal/events.ts";
import { toolAct } from "./act-definition.ts";
import type { ActContext, ActResult, Program, Reach, Slices, State, Tool, ToolAct } from "./tool-contract.ts";

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
  /** What it says is for who did it alone, when the case promises that: otherwise whoever holds the tool reads it. */
  Readonly<{ privately?: true }> &
  Readonly<{ reads?: Readonly<{ on?: string; lines: readonly unknown[] }> }> &
  /** Whom the act calls for attention, when the case promises it: nobody, for what is written only for the record. */
  Readonly<{ calls?: readonly string[] }> &
  /** What of its tool needs someone to act afterwards, when the case promises it. */
  Readonly<{ needs?: readonly Need[] }>;
/** A thing that needs someone to act, and why: it stays so until what it says is no longer true. */
export type Need = Readonly<{ target: string; why: string }>;
/** Given this, when someone does this, this happens. Nobody writes its spec: every door's check derives from it. */
export type Case<X extends Program, S extends TSchema = TSchema> = Readonly<{
  promise: string;
  given?: readonly Step[];
  by?: string;
  on?: string;
  /** The thing of another tool the person takes it from, when the case is about taking it from there. */
  from?: string;
  input: Static<S>;
  then: Outcome<X>;
}>;
/** How an act stands on a surface: what its option says, why it exists, and the key that takes it. */
export type Offered = Readonly<{ label: string; purpose: string; key: string }> &
  /** Whether it acts on the tool or on one thing of it; an act on a thing may make that thing leave its list. */
  Readonly<{ on: "tool" | "thing"; leaves?: boolean }> &
  /** The menu of its thing it is taken from, when it is not among the thing's own actions. */
  Readonly<{ under?: string }>;
/** An act on a tool that is also offered among the actions of each thing of another tool: it starts there with what
 * that thing already says of what it takes, the first things it asks; nothing, when it is not for that thing. */
export type Also<X extends Program> = Readonly<{
  tool: string;
  with: (state: State<X>, target: string) => Readonly<Record<string, unknown>> | undefined;
  /** Why it cannot be done on that thing, when that is so: it stays among the thing's actions, off, saying this. */
  off?: (state: State<X>, target: string) => string | undefined;
  /** What the questions after those open on, when that thing suggests an answer the person may change. */
  opens?: (state: State<X>, target: string) => Readonly<Record<string, unknown>>;
}>;
/** A menu of a tool's things: an option among their actions that leads to the acts under it. */
export type Menu = Readonly<{ label: string; purpose: string; key: string }>;
export type ProgramAct<X extends Program> = ToolAct<X> &
  Offered &
  Readonly<{ refuses: readonly string[]; cases: readonly Case<X>[] }> &
  /** What is put before the person to confirm, once everything was answered, when the act wants that. */
  Readonly<{ confirms?: (input: unknown) => string | undefined }> &
  /** What the thing has today, in the shape the act takes: an act that changes it opens on it. */
  Readonly<{ today?: (state: State<X>, target: string) => unknown; also?: Also<X> }>;
export type ProgramTool<X extends Program> = Omit<Tool<X>, "acts"> &
  Readonly<{ acts: Readonly<Record<string, ProgramAct<X>>>; menus?: Readonly<Record<string, Menu>> }> &
  /** The words one of its things is found by, beyond what its row on the list already says. */
  Readonly<{ words?: (state: State<X>, target: string) => string }> &
  /** The things of the tool that need someone to act, each saying why: read from what the tool keeps. */
  Readonly<{ needs?: (state: State<X>) => readonly Need[] }>;
/** A program, whole: what DESERT needs to run it and to check everything it promises. */
export type Composition<X extends Program> = Readonly<{
  words: Vocabulary<X["fact"]>;
  registry: readonly ProgramTool<X>[];
  slices: Slices<X>;
}>;
type Declared<X extends Program, S extends TSchema> = Readonly<{ input: S; reach?: Reach; output?: boolean }> &
  /** No act without its purpose, its key and its words: an option nobody can explain or reach is not an option. */
  Offered &
  Readonly<{ confirms?: (input: Static<S>) => string }> &
  Readonly<{ today?: (state: State<X>, target: string) => Static<S> | undefined }> &
  Readonly<{ also?: Also<X> }> &
  /** Every cause this act may refuse with; refusing with any other is a defect of the program. */
  Readonly<{ refuses?: readonly string[]; offered?: NonNullable<ToolAct<X>["offered"]> }> &
  Readonly<{ run(input: Static<S>, context: ActContext<X>): ActResult<X> | Promise<ActResult<X>> }> &
  /** An act without a case promises nothing: it does not compile. */
  Readonly<{ cases: readonly [Case<X, S>, ...Case<X, S>[]] }>;

/** An act of a program: what it takes, what it does, and what it promises. */
export function programAct<X extends Program, S extends TSchema>(declared: Declared<X, S>): ProgramAct<X> {
  const { input, reach, refuses = [], offered, output, run, cases, confirms } = declared;
  const { label, purpose, key, on, leaves, under, today, also } = declared;
  const placed = { ...(leaves === undefined ? {} : { leaves }), ...(under === undefined ? {} : { under }) };
  const shown: Offered = { label, purpose, key, on, ...placed };
  const summary = (value: unknown): string | undefined => (Value.Check(input, value) ? confirms?.(value) : undefined);
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
  const promised = {
    ...shown,
    refuses,
    cases,
    ...(confirms ? { confirms: summary } : {}),
    ...(today ? { today } : {}),
    ...(also ? { also } : {}),
  };
  return { ...act, ...(offered ? { offered: guarded } : {}), ...(output ? { output: true } : {}), ...promised };
}
