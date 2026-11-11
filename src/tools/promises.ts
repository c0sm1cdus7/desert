// What a program promises of each act: the causes it may refuse with, and cases that say what happens. Specs derive.
import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Vocabulary } from "../journal/events.ts";
import { toolAct } from "./act-definition.ts";
import type { ActContext, ActResult, Program, Reach, Slices, State, Tool, ToolAct } from "./tool-contract.ts";

/** Something that already happened before a case: an act of the program, by one of the house's identities. */
export type Did = Readonly<{ act: string; input: unknown; on?: string; by?: string }>;
/** What a case says came before it: each thing someone did and, when the case is about what time does, the whole
 * days that passed before what comes next. */
export type Step = Did | Readonly<{ days: number }>;
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
  /** What of its tool needs someone to act afterwards, when the case promises it; and what of other tools does,
   * each by its name, when doing this is what makes something of theirs need someone. */
  Readonly<{ needs?: readonly Need[]; needsIn?: Readonly<Record<string, readonly Need[]>> }>;
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
/** How an act stands on a surface, by parts; no part is a sentence. `name` is what its row says, in lower case:
 * a verb on its thing (`cancelar`), a new thing on its tool (`nueva venta`), the datum it changes (`cliente`).
 * `enter` is the one verb that confirms it and that `enter` says on its last question. `purpose` is why it
 * exists: an agent and help read it; a row shows a datum, never this. */
export type Offered = Readonly<{ name: string; enter: string; purpose: string; key: string }> &
  /** Whether what it does can be undone: what cannot asks to be confirmed with going back chosen. */
  Readonly<{ undoable: boolean }> &
  /** Whether it acts on the tool or on one thing of it; an act on a thing may make that thing leave its list. */
  Readonly<{ on: "tool" | "thing"; leaves?: boolean }> &
  /** The menu of its thing it is taken from, when it is not among the thing's own actions; and what the bar says
   * while it is walked, when its name with a capital does not say it. */
  Readonly<{ under?: string; title?: string }>;
/** What a row says to the right of an act: something of use about what it would do now, or nothing. */
export type Datum<X extends Program> = (state: State<X>, target: string) => string | undefined;
/** An act on a tool that is also offered among the actions of each thing of another tool: it starts there with what
 * that thing already says of what it takes, the first things it asks; nothing, when it is not for that thing. */
export type Also<X extends Program> = Readonly<{
  tool: string;
  /** What its row says there, when it is not what it says on its own tool: `cobrar` on a sale. */
  name?: string;
  datum?: Datum<X>;
  with: (state: State<X>, target: string) => Readonly<Record<string, unknown>> | undefined;
  /** Why it cannot be done on that thing, when that is so: it stays among the thing's actions, off, saying this. */
  off?: (state: State<X>, target: string) => string | undefined;
  /** What the questions after those open on, when that thing suggests an answer the person may change. */
  opens?: (state: State<X>, target: string) => Readonly<Record<string, unknown>>;
}>;
/** A menu of a tool's things: an option among their actions that leads to the acts under it. */
export type Menu = Readonly<{ name: string; purpose: string; key: string }>;
export type ProgramAct<X extends Program> = ToolAct<X> &
  Offered &
  Readonly<{ refuses: readonly string[]; cases: readonly Case<X>[] }> &
  /** What is put before the person to confirm, once everything was answered, when the act wants that. */
  Readonly<{ confirms?: (input: unknown, state: State<X>) => string | undefined }> &
  /** What the thing has today, in the shape the act takes: an act that changes it opens on it. */
  Readonly<{ today?: (state: State<X>, target: string) => unknown; also?: Also<X>; datum?: Datum<X> }>;
export type ProgramTool<X extends Program> = Omit<Tool<X>, "acts"> &
  Readonly<{ acts: Readonly<Record<string, ProgramAct<X>>>; menus?: Readonly<Record<string, Menu>> }> &
  /** The words one of its things is found by, beyond what its row on the list already says. */
  Readonly<{ words?: (state: State<X>, target: string) => string }> &
  /** The things of the tool that need someone to act, each saying why: read from what the tool keeps and from
   * what time it is, since what waits today is late tomorrow. */
  Readonly<{ needs?: (state: State<X>, now: number) => readonly Need[] }>;
/** A program, whole: what DESERT needs to run it and to check everything it promises. */
export type Composition<X extends Program> = Readonly<{
  words: Vocabulary<X["fact"]>;
  registry: readonly ProgramTool<X>[];
  slices: Slices<X>;
}>;
type Declared<X extends Program, S extends TSchema> = Readonly<{ input: S; reach?: Reach; output?: boolean }> &
  /** No act without its purpose, its key and its words: an option nobody can explain or reach is not an option. */
  Offered &
  /** What is put before the person to confirm: said from what they answered and from what the house keeps. */
  Readonly<{ confirms?: (input: Static<S>, state: State<X>) => string }> &
  Readonly<{ today?: (state: State<X>, target: string) => Static<S> | undefined }> &
  Readonly<{ also?: Also<X>; datum?: Datum<X> }> &
  /** Every cause this act may refuse with; refusing with any other is a defect of the program. */
  Readonly<{ refuses?: readonly string[]; offered?: NonNullable<ToolAct<X>["offered"]> }> &
  Readonly<{ run(input: Static<S>, context: ActContext<X>): ActResult<X> | Promise<ActResult<X>> }> &
  /** An act without a case promises nothing: it does not compile. */
  Readonly<{ cases: readonly [Case<X, S>, ...Case<X, S>[]] }>;

/** What a row says is not a sentence: it starts no phrase with a capital, carries no punctuation and is short. */
const phrase = /^(?![A-ZÁÉÍÓÚÑ][a-záéíóúñ])[^.,;:!?¡¿]{1,28}$/u;
const verb = /^[a-záéíóúñü]{2,14}$/u;
/** The name and the verb of an act as its rows will say them; an act that words itself as a sentence is refused
 * when the program is composed. */
export function worded<W extends { name: string; enter?: string }>(words: W): W {
  if (!phrase.test(words.name)) throw new Error(`An act's name is a sentence, or too long for its row: ${words.name}`);
  if (words.enter !== undefined && !verb.test(words.enter))
    throw new Error(`What confirms an act is one verb in lower case: ${words.enter}`);
  return words;
}
/** A cause is said as a datum, to the right of the act it turned off: no full stop, and short enough to fit. */
function short(cause: string): void {
  if (cause.length > 44 || /[.!?]$/u.test(cause)) throw new Error(`A cause reads as a sentence: ${cause}`);
}
/** Whether an act takes anything at all: an object with a field, or one of several shapes. */
const asksSomething = (input: TSchema): boolean => {
  const fields: unknown = Reflect.get(input, "properties");
  const filled = fields !== null && typeof fields === "object" && Object.keys(fields).length > 0;
  return filled || Array.isArray(Reflect.get(input, "anyOf"));
};
/** How a declared act stands on a surface: its words checked, and only the parts it gave. */
function offeredBy<X extends Program, S extends TSchema>(declared: Declared<X, S>): Offered {
  const { name, enter, undoable, purpose, key, on, leaves, under, title } = declared;
  const placed = { ...(leaves === undefined ? {} : { leaves }), ...(under === undefined ? {} : { under }) };
  return { ...worded({ name, enter }), undoable, purpose, key, on, ...placed, ...(title ? { title } : {}) };
}
/** An act of a program: what it takes, what it does, and what it promises. */
export function programAct<X extends Program, S extends TSchema>(declared: Declared<X, S>): ProgramAct<X> {
  const { input, reach, refuses = [], offered, output, run, cases, confirms, today, also, datum } = declared;
  refuses.forEach(short);
  /** What cannot be undone asks to be confirmed. With nothing to ask, the surface asks by itself; with something,
   * the act says what is put before the person. */
  if (!declared.undoable && !confirms && asksSomething(input))
    throw new Error(
      `An act that cannot be undone asks to be confirmed, and this one does not say what with: ${declared.name}`,
    );
  const summary = (value: unknown, state: State<X>): string | undefined =>
    Value.Check(input, value) ? confirms?.(value, state) : undefined;
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
    ...offeredBy(declared),
    refuses,
    cases,
    ...(confirms ? { confirms: summary } : {}),
    ...(today ? { today } : {}),
    ...(also ? { also } : {}),
    ...(datum ? { datum } : {}),
  };
  return { ...act, ...(offered ? { offered: guarded } : {}), ...(output ? { output: true } : {}), ...promised };
}
