// Looking for things from a menu: what a person wrote, and the rows of what it finds, on the Menu or in one tool.
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import { toolOf, type Choice, type Listed, type Picture, type Place } from "../session/screen.ts";
import { startTalk } from "../session/talk.ts";
import type { Tool } from "../contract/shown-tool.ts";
const plain = (words: string): string => words.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const wordsOf = (text: string): readonly string[] =>
  plain(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
/** A number is found by how it reads: «15» finds 00000015. */
const read = (word: string): string => (/^\d+$/u.test(word) ? word.replace(/^0+(?=\d)/u, "") : word);
/** Whether a text is what someone looks for: every word they wrote begins a word of it, whatever its accents and
 * capitals. What is written in the middle of a word finds nothing: «ana» is Ana, not «canales». */
export const matches = (text: string, sought: string): boolean => {
  const within = wordsOf(text).flatMap(word => [word, read(word)]);
  return wordsOf(sought).every(word => within.some(each => each.startsWith(word)));
};
/** The tools a person looks into from the Menu: all that say how their things are found. */
const seekers = (tools: readonly Tool[]): readonly Tool[] =>
  tools.filter(tool => tool.find !== undefined && tool.off?.() === undefined);
/** Whether a person can look for things from here: over every tool on the Menu, over one tool on its own menu. */
export const findable = (place: Picture, tools: readonly Tool[]): boolean => {
  if (place.kind === "menu") return seekers(tools).length > 0;
  return place.target === undefined && toolOf(tools, place.tool).find !== undefined;
};
const found = (tool: Tool, sought: string): Choice[] =>
  (tool.find?.(sought) ?? []).flatMap((row): Choice[] => {
    if (row.opens === undefined) return [];
    const open: Place = { kind: "view", tool: tool.id, target: row.opens, at: 0 };
    return [{ ...row, open }];
  });
/** The tools whose name is what they look for, wherever they are opened from: each row opens it. */
const named = (tools: readonly Tool[], sought: string): Choice[] =>
  tools
    .filter(tool => tool.off?.() === undefined && matches(tool.name, sought))
    .map(tool => {
      const talks = tool.conversation && !tool.conversationAt;
      const open: Place = talks ? startTalk(tool.id) : { kind: "view", tool: tool.id, at: 0 };
      return { title: tool.name.toLowerCase(), detail: tool.summary(), open };
    });
/** What a menu lists while a person looks for something: what they wrote and what it finds. No action is there,
 * and no other list. */
export function foundAt(place: Picture, sought: string, tools: readonly Tool[]): readonly Listed[] {
  const typing = {
    title: said.find,
    rows: [{ title: "", entry: { typed: sought, caret: Array.from(sought).length } }],
  };
  const wanted = sought.trim();
  const here = place.kind === "menu" ? undefined : toolOf(tools, place.tool);
  /** From the Menu, the tools themselves are found by their name, before what each of them finds. */
  const byName = here || wanted === "" ? [] : [{ title: said.sections.tools, rows: named(tools, wanted) }];
  const within = (here ? [here] : seekers(tools)).map(tool => ({
    title: here ? said.found : tool.name,
    rows: wanted === "" ? [] : found(tool, wanted),
  }));
  const results = [...byName, ...within].filter(stack => stack.rows.length);
  const none = { title: said.found, rows: [], empty: said.nothingFound };
  return [typing, ...(results.length ? results : [none])];
}
