// Where you are and what each key does there: every screen is derived from the tools, none is written by hand.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import { startTalk, type Talk } from "./talk.ts";
import { foundAt, must } from "./window.ts";
import type { Field, Option, Screen, Stack, Tool, ViewRow } from "./contract.ts";
type Picture =
  | { readonly kind: "menu"; readonly at: number }
  | { readonly kind: "view"; readonly tool: string; readonly target?: string; readonly at: number };
interface Walking {
  readonly kind: "act";
  readonly tool: string;
  readonly act: string;
  readonly target?: string;
  readonly answers: readonly string[];
  /** What was asked, as it was asked: an act can change what its questions would say now. */
  readonly asked: readonly { readonly ask: string; readonly shown: string }[];
  readonly pos: number;
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
type Place = Picture | Walk | Talk;
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
export type Choice = ViewRow & { readonly open?: Place };
type Listed = Omit<Stack, "rows"> & { rows: readonly Choice[] };

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
export const fieldOf = (tools: readonly Tool[], walk: Walk): Field | null =>
  actOf(tools, walk).next(walk.answers.slice(0, walk.pos));
export function optionsOf(field: Field | null): readonly Option[] {
  if (!field || !("options" in field)) return [];
  if (field.kind !== "confirm") return field.options;
  const back = { key: said.back.charAt(0), title: said.back, detail: said.unchanged };
  return field.reversible ? [...field.options, back] : [back, ...field.options];
}
/** A field as it opens: an earlier answer wins over its initial value, so going back keeps what you wrote. */
export const opened = (field: Field | null, answer?: string): Pick<Walk, "typed" | "caret" | "at" | "marks"> => {
  const value = answer ?? field?.initial ?? "";
  const typed = field?.kind === "text" || field?.kind === "secret" ? value : "";
  return {
    typed,
    caret: Array.from(typed).length,
    at: foundAt(optionsOf(field), option => option.title === answer),
    marks: field?.kind === "many" && value ? value.split(" · ") : [],
  };
};
export function begin(tools: readonly Tool[], tool: string, act: string, target?: string): Walk {
  const place = target === undefined ? {} : { target };
  const walk: Walk = {
    kind: "act",
    tool,
    act,
    ...place,
    answers: [],
    asked: [],
    pos: 0,
    phase: "asking",
    ...opened(null),
  };
  return { ...walk, ...opened(fieldOf(tools, walk)) };
}
function actionRows(tools: readonly Tool[], tool: Tool, target?: string): readonly Choice[] {
  const listed =
    target === undefined
      ? Object.entries(tool.acts).filter(([, act]) => act.scope === "all" && (act.available?.() ?? true))
      : Object.entries(tool.actsOn ?? {}).filter(
          ([, act]) => act.scope === "each" && (act.available?.(target) ?? true),
        );
  return listed.map(([id, act]) => ({
    ...(act.key === undefined ? {} : { key: act.key }),
    title: act.label,
    ...(act.hint === undefined ? {} : { detail: act.hint }),
    open: begin(tools, tool.id, id, target),
  }));
}
export function stacksOf(place: Picture, tools: readonly Tool[]): readonly Listed[] {
  if (place.kind === "menu") {
    return (["tools", "system"] as const)
      .map(section => ({
        title: said.sections[section],
        rows: tools
          .filter(tool => tool.place.section === section && tool.held?.() !== false)
          .map(tool => ({
            key: tool.place.key,
            title: tool.name.toLowerCase(),
            ...(tool.calls?.() ? { detail: said.attention, tone: "wait" as const } : { detail: tool.summary() }),
            open:
              tool.conversation && !tool.conversationAt
                ? startTalk(tool.id)
                : ({ kind: "view", tool: tool.id, at: 0 } as const),
          })),
      }))
      .filter(stack => stack.rows.length);
  }
  const tool = toolOf(tools, place.tool);
  const opensTo = (target: string): Place =>
    tool.conversationAt?.(target) ? startTalk(tool.id, target) : { kind: "view", tool: tool.id, target, at: 0 };
  const shown = tool.view(place.target).map(stack => ({
    ...stack,
    rows: stack.rows.map(row => {
      const { tool: acting = tool.id, target = place.target } = row.on ?? {};
      if (row.act !== undefined) return { ...row, open: begin(tools, acting, row.act, target) };
      return row.opens === undefined ? row : { ...row, open: opensTo(row.opens) };
    }),
  }));
  const acts = actionRows(tools, tool, place.target);
  return acts.length ? [...shown, { title: said.actions, rows: acts }] : shown;
}
export const choices = (place: Picture, tools: readonly Tool[]): readonly Choice[] =>
  stacksOf(place, tools).flatMap(stack => stack.rows.filter(row => row.open ?? row.press));
export const maskOf = (field: Field | null, answer: string): string =>
  field?.kind === "secret" ? "•".repeat(Array.from(answer).length) : answer;
export const validOf = (field: Field | null, typed: string): boolean =>
  (field?.valid ?? (value => value.trim() !== ""))(typed);
/** Someone else removed what you stand on: it is said as such, never drawn as another screen. */
export function goneOf(session: Session, tools: readonly Tool[]): boolean {
  const place = session.at(-1);
  const parent = session.at(-2);
  if (place?.kind !== "view" || place.target === undefined) return false;
  if (parent?.kind !== "view" && parent?.kind !== "menu") throw new Error(`nothing lists ${place.target}`);
  return !stacksOf(parent, tools).some(stack => stack.rows.some(row => row.opens === place.target));
}
export const cursorOf = (place: Picture, tools: readonly Tool[]): number =>
  Math.min(place.at, Math.max(choices(place, tools).length - 1, 0));
