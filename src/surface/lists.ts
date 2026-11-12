// What each place lists: the tools on the Menu, a tool's own rows, and the acts and menus that can be taken there.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import type { Notice, Tool, ViewRow } from "./shown-tool.ts";
import type { Tone } from "./tones.ts";
import { foundAt } from "./finding.ts";
import { begin, toolOf, type Choice, type Listed, type Picture, type Place, type Session } from "./screen.ts";
import type { Starts } from "./screen.ts";
import { startTalk } from "./talk.ts";

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
      .map(([id, act]) => ({ id, act, why: act.off?.(), datum: act.datum?.() }));
  return Object.entries(tool.actsOn ?? {})
    .filter(([, act]) => act.scope === "each" && (act.listed?.(target) ?? true))
    .map(([id, act]) => ({ id, act, why: act.off?.(target), datum: act.datum?.(target) }));
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
      return { ...row, detail: menu.purpose, opens, open };
    });
}
/** An act that cannot be done now keeps its place and its key, opens nothing, and says why where its datum goes. */
function actionRows(tools: readonly Tool[], tool: Tool, target?: string): readonly Choice[] {
  const acts = actsAt(tool, target).map(({ id, act, why, datum }) => {
    const row = {
      ...(act.key === undefined ? {} : { key: act.key }),
      title: act.label,
      starts: startsOf(tool.id, id, target),
    };
    if (why !== undefined) return { ...row, detail: why, off: true };
    return { ...row, ...(datum ? { detail: datum } : {}), open: begin(tools, tool.id, id, target) };
  });
  if (target === undefined) return acts;
  /** After its own, what other tools offer on it: each stands as its tool says, off for who does not hold that. */
  const others = (tool.alsoOn?.(target) ?? []).flatMap(row =>
    row.act === undefined || !row.on ? [] : startRow(tools, toolOf(tools, row.on.tool), row, row.act, row.on.target),
  );
  return [...menusAt(tool, target), ...acts, ...others];
}
/** A row of a view that starts an act stands like any act: off the list with it, and off while it cannot be done. */
function startRow(tools: readonly Tool[], tool: Tool, row: ViewRow, act: string, target?: string): Choice[] {
  const [listed, why] =
    target === undefined
      ? [tool.acts[act]?.listed?.(), tool.acts[act]?.off?.()]
      : [tool.actsOn?.[act]?.listed?.(target), tool.actsOn?.[act]?.off?.(target)];
  if (listed === false) return [];
  const starts = startsOf(tool.id, act, target);
  /** A row that already says why it is off stays off: the thing it stands on is why, not the act's own tool. */
  if (row.off && why === undefined) return [{ ...row, starts }];
  /** A row that shows what a datum is today keeps saying it while it cannot be changed, and then says why. */
  if (why !== undefined) return [{ ...row, detail: row.detail ? `${row.detail} · ${why}` : why, off: true, starts }];
  /** A row that says nothing to its right says what its act would: its datum, or what it is for. */
  const beside = target === undefined ? tool.acts[act]?.datum?.() : tool.actsOn?.[act]?.datum?.(target);
  const said = row.detail || !beside ? {} : { detail: beside };
  return [{ ...row, ...said, starts, open: begin(tools, tool.id, act, target, row.with) }];
}
/** A row that names something leads to it, whatever tool has it: its own first, then the one that says it is its.
 * What is of a tool this person does not hold stays named, off, and says so: nothing else of it is read here. */
function led(tools: readonly Tool[], here: Tool, row: ViewRow, target: string): Choice {
  const theirs = here.has?.(target) === true ? undefined : tools.find(tool => tool !== here && tool.has?.(target));
  if (!theirs && here.has?.(target) === false) throw new Error(`${here.id} names ${target}, and no tool has it`);
  const holder = theirs ?? here;
  const why = theirs?.off?.();
  if (theirs && why !== undefined) {
    const named = { title: theirs.titleOf?.(target) ?? row.title, detail: why, off: true };
    return row.key === undefined ? named : { ...named, key: row.key };
  }
  const open: Place = holder.conversationAt?.(target)
    ? startTalk(holder.id, target)
    : { kind: "view", tool: holder.id, target, at: 0 };
  return { ...row, open };
}
/** What a row of a view reads stays read while its act is off the list: only the way to change it goes. */
const readOr = ({ title, detail }: ViewRow, started: Choice[]): Choice[] =>
  started.length || !detail ? started : [{ title, detail }];
/** The tools that live in another: it lists them among its own, as the Menu lists the rest. */
const within = (tools: readonly Tool[], tool: Tool): readonly Tool[] =>
  tools.filter(each => each.place.inside === tool.id && each.listed?.() !== false);
/** A tool on the Menu: one that cannot be opened keeps its place and its key, and says why. */
function menuRow(tool: Tool): Choice {
  const row = { key: tool.place.key, title: tool.name.toLowerCase() };
  const why = tool.off?.();
  if (why !== undefined) return { ...row, detail: why, off: true };
  const open: Place =
    tool.conversation && !tool.conversationAt ? startTalk(tool.id) : { kind: "view", tool: tool.id, at: 0 };
  const asks = tool.calls?.() === true || (tool.notices?.().needs.length ?? 0) > 0;
  return { ...row, ...(asks ? { detail: said.attention, tone: "wait" } : { detail: tool.summary() }), open };
}
/** What a tool says a person should know of, as rows that lead to what each is about. */
const noticeRows = (tool: Tool, notices: readonly Notice[], tone?: Tone): Choice[] =>
  notices.map(({ title, detail, opens }) => {
    const leads = opens === undefined ? {} : { opens };
    const open: Place = { kind: "view", tool: tool.id, ...(opens === undefined ? {} : { target: opens }), at: 0 };
    return { title, detail, ...(tone ? { tone } : {}), ...leads, open };
  });
/** Attention and Activity, the two lists a menu opens with: what needs someone to act, and what the others did.
 * They are there even with nothing in them, unless the person prefers not to see them then. */
function noticed(tools: readonly Tool[]): readonly Listed[] {
  /** A tool a person does not hold tells them nothing, and the lists are there all the same. */
  const all = tools.flatMap(tool => {
    const notices = tool.notices?.();
    const mine = tool.off?.() === undefined;
    return notices ? [{ tool, notices: mine ? notices : { ...notices, needs: [], news: [] } }] : [];
  });
  const quiet = all.some(({ notices }) => notices.quiet);
  const needs = all.flatMap(({ tool, notices }) => noticeRows(tool, notices.needs, "wait"));
  const news = all.flatMap(({ tool, notices }) => noticeRows(tool, notices.news));
  const lists = [
    { title: said.attentionList, empty: said.nothingNeeds, rows: needs },
    { title: said.activity, empty: said.nothingNew, rows: news },
  ];
  return all.length ? lists.filter(list => list.rows.length || !quiet) : [];
}
/** Every row that leads somewhere is taken by a key: one that brings none takes a digit, in the order the rows are
 * listed, for as long as there are digits. */
function keyed(stacks: readonly Listed[]): readonly Listed[] {
  const taken = new Set(stacks.flatMap(stack => stack.rows.map(row => row.key)));
  const free = Array.from("123456789").filter(digit => !taken.has(digit));
  const withKey = (row: Choice): Choice => {
    const key = row.key === undefined && row.open ? free.shift() : undefined;
    return key === undefined ? row : { ...row, key };
  };
  return stacks.map(stack => ({ ...stack, rows: stack.rows.map(withKey) }));
}
/** What a place lists. While a person looks for something from it, only that: what they wrote and what it finds. */
export const stacksOf = (place: Picture, tools: readonly Tool[]): readonly Listed[] =>
  place.find === undefined ? keyed(listedAt(place, tools)) : foundAt(place, place.find, tools);
function listedAt(place: Picture, tools: readonly Tool[]): readonly Listed[] {
  if (place.kind === "menu") {
    const listed = tools.filter(tool => tool.listed?.() !== false);
    const sections = (["tools", "system"] as const)
      .map(section => ({
        title: said.sections[section],
        rows: listed.filter(tool => tool.place.section === section).map(menuRow),
      }))
      .filter(stack => stack.rows.length);
    return [...noticed(listed), ...sections];
  }
  const tool = toolOf(tools, place.tool);
  const read = tool.view(place.target).map(stack => ({
    ...stack,
    rows: stack.rows.flatMap((row): Choice[] => {
      /** A row that says where its act runs is taken at its word, a tool with no thing too. */
      const target = row.on ? row.on.target : place.target;
      if (row.act !== undefined)
        return readOr(row, startRow(tools, toolOf(tools, row.on?.tool ?? tool.id), row, row.act, target));
      return [row.opens === undefined ? row : led(tools, tool, row, row.opens)];
    }),
  }));
  /** Who prefers not to see what is empty sees no list with nothing in it, whatever it is a list of. */
  const shown = tool.quiet?.() ? read.filter(stack => stack.rows.length) : read;
  const acts = actionRows(tools, tool, place.target);
  const own = place.target === undefined ? [...noticed([tool, ...within(tools, tool)]), ...shown] : shown;
  const inside = place.target === undefined ? within(tools, tool).map(menuRow) : [];
  const held = inside.length ? [...own, { title: said.sections.tools, rows: inside }] : own;
  return acts.length ? [...held, { title: said.actions, rows: acts }] : held;
}
export const choices = (place: Picture, tools: readonly Tool[]): readonly Choice[] =>
  stacksOf(place, tools).flatMap(stack => stack.rows.filter(row => row.open ?? row.press));
/** Someone else removed what you stand on: it is said as such, never drawn as another screen. What the place you
 * came from no longer lists is gone only if its tool no longer answers for it: a list may let go of what you
 * opened from it because you opened it. */
export function goneOf(session: Session, tools: readonly Tool[]): boolean {
  const place = session.at(-1);
  const parent = session.at(-2);
  if (place?.kind !== "view" || place.target === undefined) return false;
  if (parent?.kind !== "view" && parent?.kind !== "menu") throw new Error(`nothing lists ${place.target}`);
  if (stacksOf(parent, tools).some(stack => stack.rows.some(row => row.opens === place.target))) return false;
  try {
    toolOf(tools, place.tool).view(place.target);
    return false;
  } catch {
    return true;
  }
}
export const cursorOf = (place: Picture, tools: readonly Tool[]): number =>
  Math.min(place.at, Math.max(choices(place, tools).length - 1, 0));
