// A program's tool on a surface when it brings no screen of its own: its rows come from what its view reads.
import { capital } from "../../../texts/capital.ts";
import { toolIndex } from "./tool-index.ts";
import { MissingView } from "../../contract/missing-view.ts";
import { OutsideDefect, programCall } from "../../../fields/program-call.ts";
import type { ProgramTool } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Tool, ViewRow } from "../../contract/shown-tool.ts";
import { must } from "../../session/window.ts";
import {
  itselfOf,
  listsOf,
  ownReads,
  placed,
  section,
  type ScreenActs,
  type Start,
  type SurfacePorts,
  type ToolWords,
} from "../ports/house-ports.ts";
import { ownView, thingView } from "./presented.ts";
import { briefOf, listedIn, rowsIn, type Changing } from "./rows.ts";
/** A label the program did not give is a defect of the program: it is named, never replaced by a code. */
const worded = (words: Readonly<Record<string, string>>, tool: string, name: string): string => {
  const word = words[name];
  if (word === undefined) throw new OutsideDefect(new Error(`${tool} has no words for ${name}`));
  return word;
};
/** The menu a destination is, when it is one: which menu of the tool, of which of its things. */
function menuAt<X extends Program>(tool: ProgramTool<X>, things: () => ReadonlySet<string>, target?: string) {
  for (const [id, menu] of Object.entries(tool.menus ?? {})) {
    const thing = target?.endsWith(`#${id}`) ? target.slice(0, -id.length - 1) : undefined;
    if (thing !== undefined && things().has(thing)) return { id, menu, thing };
  }
  return undefined;
}
/** A datum that an act changes is the row that starts that act: it shows what it is today, and opens on it. */
const changingBy =
  <X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, start: Start) =>
  (target: string): Changing =>
  (key, shown) => {
    const level = target === tool.id ? "tool" : "thing";
    const found = Object.entries(tool.acts).find(([, act]) => act.changes === key && act.on === level);
    if (!found) return undefined;
    const today = programCall(found[1].today?.bind(found[1]), ports.state(), target, ports.now());
    return start(found[0], target, { ...(today === undefined ? {} : { today }), detail: shown });
  };
type Menued = Readonly<{ id: string; thing: string }>;
/** A menu of a thing lists every act under it, each opening on what the thing has today when the act says it. */
const rowsUnder = <X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, start: Start, menu: Menued) =>
  Object.entries(tool.acts)
    .filter(([, act]) => act.under === menu.id)
    .map(([name, act]) => {
      const today = programCall(act.today?.bind(act), ports.state(), menu.thing, ports.now());
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
  const indexed = toolIndex(ports, tool, label, stacks.length > 0);
  const changing = changingBy(ports, tool, start)(tool.id);
  /** Whatever is read is read at the instant of whoever looks: a tool has no clock of its own. */
  const read = (): string =>
    programCall(tool.view.bind(tool), ports.state(), tool.id, { ...ports.limits, now: ports.now() });
  /** What the tool reads of its own goes first, in its stacks: the first line of its view. Its things follow. */
  const itself = () => (stacks.length ? ownView(stacks, read(), tool.id, changing) : []);
  const listed = (): string => (stacks.length ? read().split("\n").slice(1).join("\n") : read());
  /** What the tool itself reads on its list: a datum an act changes is the row that starts that act. */
  const own = (): ViewRow[] => rowsIn(listed(), label, changing);
  const thing = thingView(ports, tool, lists?.presents ?? []);
  const menuOf = (target?: string) => menuAt(tool, () => indexed().targets, target);
  return {
    ...acts,
    id: tool.id,
    name: words.name,
    place: placed(words),
    summary: () => briefOf(programCall(tool.summary.bind(tool), ports.state())),
    find: sought => indexed().find(sought),
    /** A thing is called what its row on the list calls it; a menu, what the tool calls it. */
    titleOf: target => {
      const menu = menuOf(target)?.menu.name;
      return menu ? capital(menu) : must(indexed().named.get(target)).title;
    },
    view: target => {
      const targets = programCall(tool.targets.bind(tool), ports.state());
      const menu = menuOf(target);
      if (menu) return [section(capital(menu.menu.name), rowsUnder(ports, tool, start, menu))];
      if (target !== undefined && !targets.includes(target)) throw new MissingView(tool.id, target);
      if (target) return thing(target);
      return [...itself(), ...(lists ? [section(lists.listed, listedIn(targets, own(), false), lists.empty)] : [])];
    },
  };
}
