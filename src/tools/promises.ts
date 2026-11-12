// What a program promises of each act: the causes it may refuse with, and cases that say what happens. Specs derive.
import { toolTexts } from "../texts/tools.texts.ts";
import { aid, short, worded } from "./act-words.ts";
import { wrongIn } from "../catalogs/fields.ts";
import { Type, type Static, type TSchema } from "@sinclair/typebox";
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
  /** What the act puts before the person to be sure, word for word, when it asks that. */
  Readonly<{ sure?: string }> &
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
  Readonly<{ under?: string; title?: string }> &
  /** The datum its tool reads that it changes, by the name the reading gives it: the act is taken from the row
   * of that datum, which shows what it is today, and is not among the actions. */
  Readonly<{ changes?: string }>;
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
  Readonly<{ confirms?: (input: unknown, state: State<X>, target: string, at: number) => string | undefined }> &
  /** What the thing has today, in the shape the act takes: an act that changes it opens on it. */
  Readonly<{ today?: (state: State<X>, target: string) => unknown; also?: Also<X>; datum?: Datum<X> }> &
  /** Why what was answered so far cannot go on, when that is so: said at the question it was answered in. */
  Readonly<{
    stops?: (answered: Readonly<Record<string, unknown>>, state: State<X>, target: string) => string | undefined;
  }>;
export type ProgramTool<X extends Program> = Omit<Tool<X>, "acts"> &
  Readonly<{ acts: Readonly<Record<string, ProgramAct<X>>>; menus?: Readonly<Record<string, Menu>> }> &
  /** Whether one of its things takes nothing new any more (archived, canceled): a question that picks among its
   * things does not offer it. */
  Readonly<{ closed?: (state: State<X>, target: string) => boolean }> &
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
  /** What is put before the person to confirm: said from what they answered, from what the house keeps, and from
   * the thing it is done to (the tool itself, for an act on the tool). */
  Readonly<{ confirms?: (input: Static<S>, state: State<X>, target: string, at: number) => string }> &
  Readonly<{ today?: (state: State<X>, target: string) => Static<S> | undefined }> &
  Readonly<{ also?: Also<X>; datum?: Datum<X> }> &
  /** Why what was answered so far cannot go on: asked after each answer, with the fields answered whole until then,
   * and said at the question that was just answered. A surface says it early; the act still refuses when run. */
  Readonly<{ stops?: NonNullable<ProgramAct<X>["stops"]> }> &
  /** Every cause this act may refuse with; refusing with any other is a defect of the program. */
  Readonly<{ refuses?: readonly string[]; offered?: NonNullable<ToolAct<X>["offered"]> }> &
  Readonly<{ run(input: Static<S>, context: ActContext<X>): ActResult<X> | Promise<ActResult<X>> }> &
  /** An act without a case promises nothing: it does not compile. */
  Readonly<{ cases: readonly [Case<X, S>, ...Case<X, S>[]] }>;

/** Whether an act takes anything at all: an object with a field, or one of several shapes. */
const asksSomething = (input: TSchema): boolean => {
  const fields: unknown = Reflect.get(input, "properties");
  const filled = fields !== null && typeof fields === "object" && Object.keys(fields).length > 0;
  return filled || Array.isArray(Reflect.get(input, "anyOf"));
};
/** How a declared act stands on a surface: its words checked, and only the parts it gave. */
function offeredBy<X extends Program, S extends TSchema>(declared: Declared<X, S>): Offered {
  const { name, enter, undoable, purpose, key, on, leaves, under, title, changes } = declared;
  const placed = { ...(leaves === undefined ? {} : { leaves }), ...(under === undefined ? {} : { under }) };
  const more = { ...(title ? { title } : {}), ...(changes ? { changes } : {}) };
  return { ...worded({ name, enter }), undoable, purpose: aid(purpose), key, on, ...placed, ...more };
}
/** What an act answers, now or later, passed through a check of it. */
const settled = <R>(result: R | Promise<R>, check: (result: R) => R): R | Promise<R> =>
  result instanceof Promise ? result.then(check) : check(result);
/** What an act says of what was answered so far: asked only about the fields it takes, answered whole. Anything
 * else a surface may give is not asked about. */
function stoppedBy<X extends Program, S extends TSchema>({ input, stops }: Declared<X, S>) {
  if (!stops) return {};
  const partial = Type.Partial(input);
  const asked: NonNullable<ProgramAct<X>["stops"]> = (answered, state, target) =>
    Value.Check(partial, answered) ? stops(answered, state, target) : undefined;
  return { stops: asked };
}
/** What the base itself refuses with is not the act's to declare: nothing would change, or a day does not exist. */
const ofTheBase = (cause: string): boolean => cause === toolTexts.unchanged || cause === toolTexts.noSuchDay;
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
  const summary = (value: unknown, state: State<X>, target: string, at: number): string | undefined =>
    Value.Check(input, value) ? confirms?.(value, state, target, at) : undefined;
  const declaredCause = (cause: string): string => {
    if (!refuses.includes(cause)) throw new Error(`An act refused with a cause it does not declare: ${cause}`);
    return cause;
  };
  const checked = (result: ActResult<X>): ActResult<X> => {
    if (result.status === "rejected" && !ofTheBase(result.reason)) declaredCause(result.reason);
    return result;
  };
  /** What a field of it says is wrong never reaches the act, through whatever door it came. */
  const held: Declared<X, S>["run"] = (value, context) => {
    const wrong = wrongIn(input, value);
    if (wrong !== undefined) return { status: "rejected", reason: wrong };
    /** An act that says what the thing is today does not leave it as it is: nothing new would be written. */
    const same = today !== undefined && Value.Equal(today(context.state, context.target), value);
    return same ? { status: "rejected", reason: toolTexts.unchanged } : run(value, context);
  };
  const act = toolAct<X, S>(input, (value, context) => settled(held(value, context), checked), reach);
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
    ...stoppedBy(declared),
  };
  return { ...act, ...(offered ? { offered: guarded } : {}), ...(output ? { output: true } : {}), ...promised };
}
