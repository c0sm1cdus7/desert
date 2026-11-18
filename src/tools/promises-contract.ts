// The declarations a program supplies once, shared by execution, surfaces and derived checks.
import type { ProgramWords } from "../fields/installable-words.ts";
import type { AdapterComposition } from "./adapter-contract.ts";
import type { CalculationVersion } from "./calculation-contract.ts";
import type { Static, TSchema } from "@sinclair/typebox";
import type { Vocabulary } from "../journal/vocabulary.ts";
import type { SoFar } from "./so-far.ts";
import type { ProgramOutside, ProgramRun } from "./promises.ts";
import type { RunResult } from "./outside.ts";
import type { ActContext, Program, Reach, Slices, State, Tool, ToolAct } from "./tool-contract.ts";
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
  Readonly<{ reads?: Readonly<{ on?: string; lines: readonly unknown[] }> }> &
  /** Whom the act calls for attention, when the case promises it: nobody, for what is written only for the record. */
  Readonly<{ calls?: readonly string[] }> &
  /** What of its tool needs someone to act afterwards, when the case promises it; and what of other tools does,
   * each by its name, when doing this is what makes something of theirs need someone. */
  Readonly<{ needs?: readonly Need[]; needsIn?: Readonly<Record<string, readonly Need[]>> }>;
/** A thing that needs someone to act, and why: it stays so until what it says is no longer true. */
export type Need = Readonly<{ target: string; why: string; to?: string }>;
/** Given this, when someone does this, this happens. Nobody writes its spec: every door's check derives from it. */
export type Case<X extends Program, S extends TSchema = TSchema> = Readonly<{
  promise: string;
  /** The initial instant of this case, before its given steps; otherwise the base's fixed case instant. */
  at?: number;
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
  with: (state: State<X>, target: string, at: number) => Readonly<Record<string, unknown>> | undefined;
  /** Why it cannot be done on that thing, when that is so: it stays among the thing's actions, off, saying this. */
  off?: (state: State<X>, target: string, at: number) => string | undefined;
  /** What the questions after those open on, when that thing suggests an answer the person may change. */
  opens?: (state: State<X>, target: string) => Readonly<Record<string, unknown>>;
}>;
/** A menu of a tool's things: an option among their actions that leads to the acts under it. */
export type Menu = Readonly<{ name: string; purpose: string; key: string }>;
export type ProgramAct<X extends Program, O extends readonly string[] = readonly string[]> = Omit<ToolAct<X>, "run"> &
  Readonly<{ run: ProgramRun<X, O> }> &
  /** The folder an installed group acts on, while authority remains with the owning engine tool. */
  Readonly<{ folder?: string }> &
  Offered &
  Readonly<{ refuses: readonly string[]; outside: ProgramOutside<O>; cases: readonly Case<X>[] }> &
  /** What is put before the person to confirm, once everything was answered, when the act wants that. */
  Readonly<{ confirms?: (input: unknown, state: State<X>, target: string, at: number) => string | undefined }> &
  /** What the thing has today, in the shape the act takes: an act that changes it opens on it. */
  Readonly<{ today?: (state: State<X>, target: string, at: number) => unknown; also?: Also<X>; datum?: Datum<X> }> &
  SoFar<X>;
export type ProgramTool<X extends Program> = Omit<Tool<X>, "acts"> &
  Readonly<{ acts: Readonly<Record<string, ProgramAct<X>>>; menus?: Readonly<Record<string, Menu>> }> &
  /** Installed groups retain their local presentation and action placement under one engine owner. */
  Readonly<{ groups?: readonly Readonly<{ tool: ProgramTool<X>; palabras: ProgramWords }>[] }> &
  /** Whether one of its things takes nothing new any more (archived, canceled): a question that picks among its
   * things does not offer it. */
  Readonly<{ closed?: (state: State<X>, target: string, at: number) => boolean }> &
  /** The words one of its things is found by, beyond what its row on the list already says. */
  Readonly<{ words?: (state: State<X>, target: string) => string }> &
  /** The things of the tool that need someone to act, each saying why: read from what the tool keeps and from
   * what time it is, since what waits today is late tomorrow. */
  Readonly<{ needs?: (state: State<X>, now: number) => readonly Need[] }>;
/** A program, whole: what DESERT needs to run it and to check everything it promises. */
export type Composition<X extends Program> = AdapterComposition &
  Readonly<{
    identities?: boolean;
    mentes?: Readonly<{ asistentes: boolean; programas: readonly string[] }>;
    projectionVersion: CalculationVersion;
    words: Vocabulary<X["fact"]>;
    registry: readonly ProgramTool<X>[];
    slices: Slices<X>;
  }>;
export type Declared<X extends Program, S extends TSchema, O extends readonly string[]> = Readonly<{
  input: S;
  reach?: Reach;
  needs?: ToolAct<X>["needs"];
  output?: boolean;
}> &
  /** No act without its purpose, its key and its words: an option nobody can explain or reach is not an option. */
  Offered &
  /** What is put before the person to confirm: said from what they answered, from what the house keeps, and from
   * the thing it is done to (the tool itself, for an act on the tool). */
  Readonly<{ confirms?: (input: Static<S>, state: State<X>, target: string, at: number) => string }> &
  Readonly<{ today?: (state: State<X>, target: string, at: number) => Static<S> | undefined }> &
  Readonly<{ also?: Also<X>; datum?: Datum<X> }> &
  SoFar<X> &
  /** Every cause this act may refuse with; refusing with any other is a defect of the program. */
  Readonly<{ refuses?: readonly string[]; offered?: NonNullable<ToolAct<X>["offered"]> }> &
  (O extends readonly []
    ? Readonly<{ outside?: O }>
    : Readonly<{ outside: O & (string extends O[number] ? never : unknown) }>) &
  Readonly<{
    run(input: Static<S>, context: ActContext<X>): RunResult<X, NoInfer<O>> | Promise<RunResult<X, NoInfer<O>>>;
  }> &
  /** An act without a case promises nothing: it does not compile. */
  Readonly<{ cases: readonly [Case<X, S>, ...Case<X, S>[]] }>;
