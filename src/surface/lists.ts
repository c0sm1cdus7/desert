// What each place lists: the tools on the Menu, a tool's own rows, and the acts and menus that can be taken there.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import type { Stack, Tool, ViewRow } from "./contract.ts";
import { begin, toolOf, type Picture, type Place, type Session } from "./screen.ts";
import { startTalk } from "./talk.ts";

/** The act a row starts: said even while the act is off, so anyone can tell which act the row stands for. */
type Starts = Readonly<{ tool: string; act: string; target?: string }>;
export type Choice = ViewRow & { readonly open?: Place; readonly starts?: Starts };
type Listed = Omit<Stack, "rows"> & { rows: readonly Choice[] };
const startsOf = (tool: string, act: string, target?: string): Starts => ({
  tool,
  act,
  ...(target === undefined ? {} : { target }),
});
/** Every act taken straight from this place, each with why it cannot be done now, when that is so. */
function actsAt(tool: Tool, target?: string) {
  if (target === undefined)
    return Object.entries(tool.acts)
      .filter(([, act]) => act.scope === "all" && (act.listed?.() ?? true))
      .map(([id, act]) => ({ id, act, why: act.off?.() }));
  return Object.entries(tool.actsOn ?? {})
    .filter(([, act]) => act.scope === "each" && (act.listed?.(target) ?? true))
    .map(([id, act]) => ({ id, act, why: act.off?.(target) }));
}
/** A menu among a thing's actions: it opens another list of the same tool; off, it says why and opens nothing. */
function menusAt(tool: Tool, target: string): readonly Choice[] {
  return Object.values(tool.menusOn ?? {})
    .filter(menu => menu.listed?.(target) ?? true)
    .map(menu => {
      const row = { key: menu.key, title: menu.label };
      const why = menu.off?.(target);
      if (why !== undefined) return { ...row, detail: why, off: true };
      const opens = menu.opens(target);
      const open: Place = { kind: "view", tool: tool.id, target: opens, at: 0 };
      return { ...row, ...(menu.hint === undefined ? {} : { detail: menu.hint }), opens, open };
    });
}
/** An act that cannot be done now keeps its place and its key, opens nothing, and says why instead of what for. */
function actionRows(tools: readonly Tool[], tool: Tool, target?: string): readonly Choice[] {
  const acts = actsAt(tool, target).map(({ id, act, why }) => {
    const row = {
      ...(act.key === undefined ? {} : { key: act.key }),
      title: act.label,
      starts: startsOf(tool.id, id, target),
    };
    if (why !== undefined) return { ...row, detail: why, off: true };
    return { ...row, ...(act.hint === undefined ? {} : { detail: act.hint }), open: begin(tools, tool.id, id, target) };
  });
  return target === undefined ? acts : [...menusAt(tool, target), ...acts];
}
/** A row of a view that starts an act stands like any act: off the list with it, and off while it cannot be done. */
function startRow(tools: readonly Tool[], tool: Tool, row: ViewRow, act: string, target?: string): Choice[] {
  const [listed, why] =
    target === undefined
      ? [tool.acts[act]?.listed?.(), tool.acts[act]?.off?.()]
      : [tool.actsOn?.[act]?.listed?.(target), tool.actsOn?.[act]?.off?.(target)];
  if (listed === false) return [];
  const starts = startsOf(tool.id, act, target);
  if (why !== undefined) return [{ ...row, detail: why, off: true, starts }];
  return [{ ...row, starts, open: begin(tools, tool.id, act, target, row.with) }];
}
/** A tool on the Menu: one that cannot be opened keeps its place and its key, and says why. */
function menuRow(tool: Tool): Choice {
  const row = { key: tool.place.key, title: tool.name.toLowerCase() };
  const why = tool.off?.();
  if (why !== undefined) return { ...row, detail: why, off: true };
  const open: Place =
    tool.conversation && !tool.conversationAt ? startTalk(tool.id) : { kind: "view", tool: tool.id, at: 0 };
  return { ...row, ...(tool.calls?.() ? { detail: said.attention, tone: "wait" } : { detail: tool.summary() }), open };
}
export function stacksOf(place: Picture, tools: readonly Tool[]): readonly Listed[] {
  if (place.kind === "menu") {
    return (["tools", "system"] as const)
      .map(section => ({
        title: said.sections[section],
        rows: tools.filter(tool => tool.place.section === section && tool.listed?.() !== false).map(menuRow),
      }))
      .filter(stack => stack.rows.length);
  }
  const tool = toolOf(tools, place.tool);
  const opensTo = (target: string): Place =>
    tool.conversationAt?.(target) ? startTalk(tool.id, target) : { kind: "view", tool: tool.id, target, at: 0 };
  const shown = tool.view(place.target).map(stack => ({
    ...stack,
    rows: stack.rows.flatMap((row): Choice[] => {
      const { tool: acting = tool.id, target = place.target } = row.on ?? {};
      if (row.act !== undefined) return startRow(tools, toolOf(tools, acting), row, row.act, target);
      return [row.opens === undefined ? row : { ...row, open: opensTo(row.opens) }];
    }),
  }));
  const acts = actionRows(tools, tool, place.target);
  return acts.length ? [...shown, { title: said.actions, rows: acts }] : shown;
}
export const choices = (place: Picture, tools: readonly Tool[]): readonly Choice[] =>
  stacksOf(place, tools).flatMap(stack => stack.rows.filter(row => row.open ?? row.press));
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
