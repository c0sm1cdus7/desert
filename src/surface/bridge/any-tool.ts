// A program's tool on a surface when it brings no screen of its own: its rows come from what its view reads.
import type { ProgramTool } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Tool, ViewRow } from "../contract.ts";
import { must } from "../window.ts";
import { section, type ScreenActs, type Start, type SurfacePorts, type ToolWords } from "./house-ports.ts";
import { briefOf, listedIn, rowsIn } from "./rows.ts";

/** A label the program did not give is a defect of the program: it is named, never replaced by a code. */
const worded = (words: Readonly<Record<string, string>>, tool: string, name: string): string => {
  const word = words[name];
  if (word === undefined) throw new Error(`${tool} has no words for ${name}`);
  return word;
};
/** The menu a destination is, when it is one: which menu of the tool, of which of its things. */
function menuAt<X extends Program>(tool: ProgramTool<X>, things: readonly string[], target?: string) {
  for (const [id, menu] of Object.entries(tool.menus ?? {})) {
    const thing = target?.endsWith(`#${id}`) ? target.slice(0, -id.length - 1) : undefined;
    if (thing !== undefined && things.includes(thing)) return { id, menu, thing };
  }
  return undefined;
}
export function anyToolScreen<X extends Program>(
  ports: SurfacePorts<X>,
  tool: ProgramTool<X>,
  words: ToolWords,
  acts: ScreenActs,
  start: Start,
): Tool {
  const label = (key: string): string => worded(words.reads, tool.id, key);
  const view = (target: string): ViewRow[] => rowsIn(tool.view(ports.state(), target, ports.limits), label);
  const menuOf = (target?: string) => menuAt(tool, tool.targets(ports.state()), target);
  /** A menu of a thing lists every act under it, each opening on what the thing has today when the act says it. */
  const menuRows = ({ id, thing }: NonNullable<ReturnType<typeof menuOf>>): ViewRow[] =>
    Object.entries(tool.acts)
      .filter(([, act]) => act.under === id)
      .map(([name, act]) => {
        const today = act.today?.(ports.state(), thing);
        return start(name, thing, today === undefined ? {} : { today });
      });
  return {
    ...acts,
    id: tool.id,
    name: words.name,
    place: { key: words.key, section: words.system ? "system" : "tools" },
    summary: () => briefOf(tool.summary(ports.state())),
    /** A thing is called what its row on the list calls it; a menu, what the tool calls it. */
    titleOf: target => menuOf(target)?.menu.label ?? must(view(tool.id).find(row => row.opens === target)).title,
    view: target => {
      const targets = tool.targets(ports.state());
      const menu = menuOf(target);
      if (menu) return [section(menu.menu.label, menuRows(menu))];
      if (target !== undefined && !targets.includes(target)) throw new Error(`${tool.id} has no ${target}`);
      const inside = ({ opens, ...row }: ViewRow): ViewRow =>
        opens && opens !== target && targets.includes(opens) ? { ...row, opens } : row;
      if (target) return [section(words.shown, view(target).map(inside), words.empty)];
      return [section(words.listed, listedIn(targets, view(tool.id)), words.empty)];
    },
  };
}
