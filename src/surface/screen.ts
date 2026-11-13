// Where you are on a surface and the act you are walking: what a session remembers, and how an act begins.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import { withStops } from "./guards/answer-status.ts";
import { currentField, markedCurrent, uniqueCurrent } from "./current-field.ts";
import type { Walk, Running } from "./walk-state.ts";
export type { Asking, Running, Done, Walk } from "./walk-state.ts";
import type { Talk } from "./talk.ts";
import { must } from "./window.ts";
import type { Field, Option, Screen, Stack } from "./contract.ts";
import type { Tool, ViewRow } from "./shown-tool.ts";
/** What a person wrote to look for something, while a menu is in that mode: nothing else is on it then. */
type Finding = { readonly find?: string } & {
  /** How many lists what is shown is moved from the one with the chosen row: at either end of what can be chosen,
   * the same key brings into view what is only read beyond it. */
  readonly shift?: number;
  readonly reading?: number;
};
export type Picture =
  | ({ readonly kind: "menu"; readonly at: number } & Finding)
  | ({ readonly kind: "view"; readonly tool: string; readonly target?: string; readonly at: number } & Finding);
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
    today: () => act.today?.(target),
    next: (answers: readonly string[]) => act.next(answers, target),
    stops: (answers: readonly string[]) => act.stops?.(answers, target),
    run: (answers: readonly string[]) => act.run(answers, target),
  };
}
export function fieldOf(tools: readonly Tool[], walk: Walk): Field | null {
  if (walk.pos === walk.until) return null;
  const field = actOf(tools, walk).next(walk.answers.slice(0, walk.pos));
  return field ? withStops(walk, currentField(walk, field, actOf(tools, walk)), actOf(tools, walk)) : null;
}
/** The key that goes back where an act asks to be confirmed. */
export const backKey = said.back.charAt(0);
export function optionsOf(field: Field | null): readonly Option[] {
  if (!field || !("options" in field)) return [];
  if (field.kind !== "confirm") return uniqueCurrent(field.options.map(option => markedCurrent(field, option)));
  const back = { key: backKey, title: said.back, detail: said.unchanged };
  return field.reversible ? [...field.options, back] : [back, ...field.options];
}
/** A field as it opens: an earlier answer wins over its initial value, so going back keeps what you wrote. A choice
 * opens on the option it already is. */
type Opened = Pick<Walk, "typed" | "caret" | "at" | "marks" | "suggested" | "currency">;
export const opened = (field: Field | null, answer?: string): Opened => {
  const value = answer ?? field?.initial ?? "";
  const typed = field?.kind === "text" || field?.kind === "secret" ? value : "";
  const options = field?.kind === "pick" ? field.found("") : optionsOf(field);
  const matched = options.findIndex(option => !option.off && (option.value ?? option.title) === value);
  const at = matched >= 0 ? matched : options.findIndex(option => !option.off);
  return {
    typed,
    currency: field?.currency ?? "",
    caret: Array.from(typed).length,
    at,
    marks: field?.kind === "many" && value ? value.split(" · ") : [],
    suggested: typed !== "",
  };
};
/** What a question that picks a thing lists: while the person looks for one, never the row that makes a new one. */
export const pickedFrom = (
  field: Field & { kind: "pick" },
  walk: Pick<Walk, "finding" | "typed">,
): readonly Option[] => (walk.finding ? field.found(walk.typed).filter(option => !option.makes) : field.found(""));
/** An answer as it is shown: a secret as dots, a field with a format in its shape, anything else as written. */
export const maskOf = (field: Field | null, answer: string): string => {
  if (field?.kind === "secret") return "•".repeat(Array.from(answer).length);
  if (field?.kind === "pick") return field.shown(answer);
  /** Nothing written reads as nothing: the shape of an empty field is not an answer, and zero is not "no answer". */
  if (answer === "") return "";
  return field && "mask" in field ? field.mask.shown(answer) : answer;
};
/** Recheck the cursor after opening has loaded the initial marks. */
export const opening = <W extends Walk>(tools: readonly Tool[], walk: W, answer?: string): W => {
  const result = { ...walk, ...opened(fieldOf(tools, walk), answer) };
  const field = fieldOf(tools, result);
  const options = field?.kind === "pick" ? field.found("") : optionsOf(field);
  return options[result.at]?.off ? { ...result, at: options.findIndex(option => !option.off) } : result;
};
/** Whether what is written can be sent: it is valid, and where it is all the act asks, it is not what the datum
 * already is. Writing the same again would change nothing. */
export const validOf = (field: Field | null, typed: string): boolean =>
  (field?.valid ?? (value => value.trim() !== ""))(typed) &&
  field?.wrong?.(typed) === undefined &&
  !(field?.unchanged?.(typed) ?? (field?.only === true && field.current === typed));
/** A walk as it begins. A row may start it with answers it already has: what comes before the first one it asks is
 * fixed by where the row stands and shows as answered, and each question opens on the answer it has. */
export function begin(tools: readonly Tool[], tool: string, act: string, target?: string, given?: ViewRow["with"]) {
  const shown = toolOf(tools, tool);
  const current = target === undefined ? shown.acts[act]?.today?.() : shown.actsOn?.[act]?.today?.(target);
  const { answers = current ?? [], from = 0, until } = given ?? {};
  const today = current !== undefined || given?.today === true;
  const limits = {
    floor: from,
    ...(until === undefined ? {} : { until }),
    ...(given || today ? { carried: true as const } : {}),
    ...(today ? { was: current ?? answers } : {}),
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
    return { ask: field.ask, shown: maskOf(field, answer), ...(field.currency ? { currency: field.currency } : {}) };
  });
  /** It asks one datum when it stops right after it, or when nothing but being sure comes after it. */
  const after = until === undefined ? next(answers.slice(0, from + 1)) : null;
  const lone = today && (until === undefined ? !after || after.kind === "confirm" : until - from === 1);
  const walk: Walk = { ...bare, asked, ...(lone ? { lone: true as const } : {}) };
  return opening(tools, walk, answers[from]);
}
