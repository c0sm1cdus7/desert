// Looking for things from a menu: what a person wrote, and the rows of what it finds, on the Menu or in one tool.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import { toolOf, type Choice, type Listed, type Picture, type Place } from "./screen.ts";
import type { Tool } from "./shown-tool.ts";

const plain = (words: string): string => words.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/** Whether a text is what someone looks for: every word they wrote is somewhere in it, whatever its accents and
 * capitals. */
export const matches = (text: string, sought: string): boolean => {
  const within = plain(text);
  const words = plain(sought).split(/\s+/u).filter(Boolean);
  return words.every(word => within.includes(word));
};
/** The tools a person looks into from the Menu: the ones they hold that say how their things are found. */
const seekers = (tools: readonly Tool[]): readonly Tool[] =>
  tools.filter(tool => tool.find !== undefined && tool.listed?.() !== false && tool.off?.() === undefined);
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
/** What a menu lists while a person looks for something: what they wrote and what it finds. No action is there,
 * and no other list. */
export function foundAt(place: Picture, sought: string, tools: readonly Tool[]): readonly Listed[] {
  const typing = {
    title: said.find,
    rows: [{ title: "", entry: { typed: sought, caret: Array.from(sought).length } }],
  };
  const wanted = sought.trim();
  const here = place.kind === "menu" ? undefined : toolOf(tools, place.tool);
  const results = (here ? [here] : seekers(tools))
    .map(tool => ({ title: here ? said.found : tool.name, rows: wanted === "" ? [] : found(tool, wanted) }))
    .filter(stack => stack.rows.length);
  const none = { title: said.found, rows: [], empty: said.nothingFound };
  return [typing, ...(results.length ? results : [none])];
}
