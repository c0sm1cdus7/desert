// Where you are on a surface and the act you are walking: what a session remembers, and how an act begins.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import type { Talk } from "./talk.ts";
import { foundAt, must } from "./window.ts";
import type { Field, Option, Screen, Stack } from "./contract.ts";
import type { Tool, ViewRow } from "./shown-tool.ts";
/** What a person wrote to look for something, while a menu is in that mode: nothing else is on it then. */
type Finding = { readonly find?: string };
export type Picture =
  | ({ readonly kind: "menu"; readonly at: number } & Finding)
  | ({ readonly kind: "view"; readonly tool: string; readonly target?: string; readonly at: number } & Finding);
interface Walking {
  readonly kind: "act";
  readonly tool: string;
  readonly act: string;
  readonly target?: string;
  readonly answers: readonly string[];
  /** What was asked, as it was asked: an act can change what its questions would say now. */
  readonly asked: readonly { readonly ask: string; readonly shown: string }[];
  readonly pos: number;
  /** The first question it asks: what comes before was fixed by the row that started it. */
  readonly floor: number;
  /** Where it stops asking, when it asks only part of what the act takes: the rest it already has. */
  readonly until?: number;
  /** It began with answers it already had: what the thing is today. */
  readonly carried?: true;
  readonly typed: string;
  readonly caret: number;
  readonly at: number;
  readonly marks: readonly string[];
  readonly error?: string;
}
export type Asking = Walking & { readonly phase: "asking" };
export type Running = Walking & { readonly phase: "running"; readonly since: number };
export type Done = Walking & { readonly phase: "done"; readonly done: string; readonly doneAt?: string };
export type Walk = Asking | Running | Done;
export type Place = Picture | Walk | Talk;
/** The act a row starts: said even while the act is off, so anyone can tell which act the row stands for. */
export type Starts = Readonly<{ tool: string; act: string; target?: string }>;
export type Choice = ViewRow & { readonly open?: Place; readonly starts?: Starts };
export type Listed = Omit<Stack, "rows"> & { rows: readonly Choice[] };
/** Memory of this one device: it never reaches the journal, and a crash loses a half-filled action. */
export type Session = readonly Place[];
export const start: Session = [{ kind: "menu", at: 0 }];
export interface Bar {
  readonly state: Screen["state"];
  readonly clock: string;
  readonly battery?: string;
  readonly now: number;
}
export interface Viewport {
  readonly rows: number;
}
export interface Stepped {
  readonly session: Session;
  readonly run?: Running;
  /** A message on its way: the session settles it when the house answers. */
  readonly sending?: Promise<string | undefined>;
  readonly quit?: true;
}
export const toolOf = (tools: readonly Tool[], id: string): Tool => {
  const tool = tools.find(known => known.id === id);
  if (!tool) throw new Error(`unknown tool ${id}`);
  return tool;
};
/** The act a walk is on, already holding its destination. Only here does a walk meet an act. */
export function actOf(tools: readonly Tool[], walk: Walk) {
  const tool = toolOf(tools, walk.tool);
  const { target } = walk;
  if (target === undefined) {
    const act = must(tool.acts[walk.act]);
    return { ...act, leaves: false, title: () => act.title?.() };
  }
  const act = must(tool.actsOn?.[walk.act]);
  return {
    ...act,
    title: () => act.title?.(target),
    next: (answers: readonly string[]) => act.next(answers, target),
    run: (answers: readonly string[]) => act.run(answers, target),
  };
}
/** The question a walk stands on; none once it has asked everything it was started to ask. */
export const fieldOf = (tools: readonly Tool[], walk: Walk): Field | null =>
  walk.pos === walk.until ? null : actOf(tools, walk).next(walk.answers.slice(0, walk.pos));
/** The key that goes back where an act asks to be confirmed. */
export const backKey = said.back.charAt(0);
export function optionsOf(field: Field | null): readonly Option[] {
  if (!field || !("options" in field)) return [];
  if (field.kind !== "confirm") return field.options;
  const back = { key: backKey, title: said.back, detail: said.unchanged };
  return field.reversible ? [...field.options, back] : [back, ...field.options];
}
/** A field as it opens: an earlier answer wins over its initial value, so going back keeps what you wrote. A choice
 * opens on the option it already is. */
export const opened = (field: Field | null, answer?: string): Pick<Walk, "typed" | "caret" | "at" | "marks"> => {
  const value = answer ?? field?.initial ?? "";
  const typed = field?.kind === "text" || field?.kind === "secret" ? value : "";
  return {
    typed,
    caret: Array.from(typed).length,
    at: foundAt(optionsOf(field), option => option.title === value),
    marks: field?.kind === "many" && value ? value.split(" · ") : [],
  };
};
/** An answer as it is shown: a secret as dots, a field with a format in its shape, anything else as written. */
export const maskOf = (field: Field | null, answer: string): string => {
  if (field?.kind === "secret") return "•".repeat(Array.from(answer).length);
  return field && "mask" in field ? field.mask.shown(answer) : answer;
};
export const validOf = (field: Field | null, typed: string): boolean =>
  (field?.valid ?? (value => value.trim() !== ""))(typed);
/** A walk as it begins. A row may start it with answers it already has: what comes before the first one it asks is
 * fixed by where the row stands and shows as answered, and each question opens on the answer it has. */
export function begin(tools: readonly Tool[], tool: string, act: string, target?: string, given?: ViewRow["with"]) {
  const { answers = [], from = 0, until } = given ?? {};
  const limits = {
    floor: from,
    ...(until === undefined ? {} : { until }),
    ...(given ? { carried: true as const } : {}),
  };
  const place = target === undefined ? {} : { target };
  const bare: Walk = {
    kind: "act",
    tool,
    act,
    ...place,
    answers,
    asked: [],
    pos: from,
    ...limits,
    phase: "asking",
    ...opened(null),
  };
  const { next } = actOf(tools, bare);
  const asked = answers.slice(0, from).map((answer, index) => {
    const field = must(next(answers.slice(0, index)));
    return { ask: field.ask, shown: maskOf(field, answer) };
  });
  const walk: Walk = { ...bare, asked };
  return { ...walk, ...opened(fieldOf(tools, walk), answers[from]) };
}
