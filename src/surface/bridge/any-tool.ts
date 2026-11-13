// A program's tool on a surface when it brings no screen of its own: its rows come from what its view reads.
import type { ProgramTool } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { matches } from "../finding.ts";
import type { Tool, ViewRow } from "../shown-tool.ts";
import { must } from "../window.ts";
import { itselfOf, listsOf, ownReads, placed, section } from "./house-ports.ts";
import type { ScreenActs, Start, SurfacePorts, ToolWords } from "./house-ports.ts";
import { capital } from "./program-acts.ts";
import { ownView, thingView } from "./presented.ts";
import { briefOf, listedIn, rowsIn, type Changing, type Labels } from "./rows.ts";

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
/** The things of a tool that are what someone looks for: every one of them is looked into, not only the recent
 * ones its list shows; each by what its row says and by the words its tool adds. */
function foundIn<X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, label: Labels, sought: string) {
  const state = ports.state();
  const all = rowsIn(tool.view(state, tool.id, { recentLines: Number.MAX_SAFE_INTEGER, now: ports.now() }), label);
  const said = (row: ViewRow): string => [row.title, row.detail, tool.words?.(state, row.opens ?? "")].join(" ");
  return listedIn(tool.targets(state), all).filter(row => matches(said(row), sought));
}
/** A datum that an act changes is the row that starts that act: it shows what it is today, and opens on it. */
const changingBy =
  <X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, start: Start) =>
  (target: string): Changing =>
  (key, shown) => {
    const level = target === tool.id ? "tool" : "thing";
    const found = Object.entries(tool.acts).find(([, act]) => act.changes === key && act.on === level);
    if (!found) return undefined;
    const today = found[1].today?.(ports.state(), target, ports.now());
    return start(found[0], target, { ...(today === undefined ? {} : { today }), detail: shown });
  };
type Menued = Readonly<{ id: string; thing: string }>;
/** A menu of a thing lists every act under it, each opening on what the thing has today when the act says it. */
const rowsUnder = <X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, start: Start, menu: Menued) =>
  Object.entries(tool.acts)
    .filter(([, act]) => act.under === menu.id)
    .map(([name, act]) => {
      const today = act.today?.(ports.state(), menu.thing, ports.now());
      return start(name, menu.thing, today === undefined ? {} : { today });
    });
export function anyToolScreen<X extends Program>(
  ports: SurfacePorts<X>,
  tool: ProgramTool<X>,
  words: ToolWords,
  acts: ScreenActs,
  start: Start,
): Tool {
  const reads = ownReads(words);
  const label = (key: string): string => worded(reads, tool.id, key);
  const [lists, stacks] = [listsOf(words), itselfOf(words)];
  const changing = changingBy(ports, tool, start)(tool.id);
  /** Whatever is read is read at the instant of whoever looks: a tool has no clock of its own. */
  const read = (): string => tool.view(ports.state(), tool.id, { ...ports.limits, now: ports.now() });
  /** What the tool reads of its own goes first, in its stacks: the first line of its view. Its things follow. */
  const itself = () => (stacks.length ? ownView(stacks, read(), tool.id, changing) : []);
  const listed = (): string => (stacks.length ? read().split("\n").slice(1).join("\n") : read());
  /** What the tool itself reads on its list: a datum an act changes is the row that starts that act. */
  const own = (): ViewRow[] => rowsIn(listed(), label, changing);
  const thing = thingView(ports, tool, lists?.presents ?? []);
  const menuOf = (target?: string) => menuAt(tool, tool.targets(ports.state()), target);
  const menuRows = (menu: Menued): ViewRow[] => rowsUnder(ports, tool, start, menu);
  return {
    ...acts,
    id: tool.id,
    name: words.name,
    place: placed(words),
    summary: () => briefOf(tool.summary(ports.state())),
    find: sought => foundIn(ports, tool, label, sought),
    /** A thing is called what its row on the list calls it; a menu, what the tool calls it. */
    titleOf: target => {
      const menu = menuOf(target)?.menu.name;
      return menu ? capital(menu) : must(own().find(row => row.opens === target)).title;
    },
    view: target => {
      const targets = tool.targets(ports.state());
      const menu = menuOf(target);
      if (menu) return [section(capital(menu.menu.name), menuRows(menu))];
      if (target !== undefined && !targets.includes(target)) throw new Error(`${tool.id} has no ${target}`);
      if (target) return thing(target);
      return [...itself(), ...(lists ? [section(lists.listed, listedIn(targets, own()), lists.empty)] : [])];
    },
  };
}
