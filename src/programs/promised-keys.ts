// How a derived check moves through a program by keys: from the Menu to a tool, to one of its things, to an act's row.
import { ok, strictEqual } from "node:assert/strict";
import { caseInstant } from "../catalogs/time.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { houseTools } from "../surface/bridge/house-tools.ts";
import type { Tool } from "../surface/shown-tool.ts";
import { startRouter, type Router } from "../surface/router.ts";
import { choices, stacksOf } from "../surface/lists.ts";
import type { Choice } from "../surface/screen.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import type { Program } from "../tools/tool-contract.ts";
import { localPorts } from "./house-runtime.ts";
import type { Aim, House } from "./promised-stage.ts";

export const view = { rows: 40 };
/** The room a list has on the smallest terminal there is, 40×16. */
const smallest = { rows: 8 };
const noted = (count?: number): number => Number((count ?? 0) > 0);
/** Whatever a person has in front fits the smallest terminal: a question keeps its own line and its options say
 * how many are left out; a list is cut around the chosen row. Nothing is left to be drawn over the bars. */
export function fitsSmallest(router: Router): void {
  const { body } = router.screen(smallest);
  if (body.kind === "thread") {
    const lines = (body.options?.length ?? 0) + noted(body.more?.above) + noted(body.more?.below);
    ok(lines <= smallest.rows - 2, said.overflows);
  }
  if (body.kind !== "list") return;
  const lines = body.stacks.map(stack => 1 + Math.max(stack.rows.length, 1) + noted(stack.above) + noted(stack.below));
  ok(lines.reduce((sum, each) => sum + each, 0) + body.stacks.length - 1 <= smallest.rows, said.overflows);
}
const bar = { state: "connected", clock: "00:00", now: caseInstant } as const;
export const type = (router: Router, text: string): void => {
  for (const char of Array.from(text)) router.send({ kind: "type", text: char });
};
/** A program as one identity has it in front: its tools as that identity sees them, and a router on the Menu. */
export function seated<X extends Program>(house: House<X>, by: string, shown: Shown<X>) {
  const ports = localPorts(house, by, { recentLines: 100 }, house.now);
  const tools = houseTools(ports, shown);
  return { tools, shown, state: ports.state, router: startRouter({ tools, bar: () => bar, changes: ports.watch }) };
}
export type Seat<X extends Program> = ReturnType<typeof seated<X>>;
type Reached = Readonly<{ target?: string; rows: readonly number[] }>;
const placeOf = (tool: string, target?: string) =>
  ({ kind: "view", tool, at: 0, ...(target === undefined ? {} : { target }) }) as const;
/** What one view opens: each thing a row of it leads to, with the rows opened to get there. */
const opensFrom = (tools: readonly Tool[], tool: string, { target, rows }: Reached): Required<Reached>[] =>
  choices(placeOf(tool, target), tools).flatMap((row, at) =>
    /** Only what the tool itself has: what a row names of another tool is that tool's to walk. */
    row.opens !== undefined && row.open?.kind === "view" && row.open.tool === tool
      ? [{ target: row.opens, rows: [...rows, at] }]
      : [],
  );
/** The rows a person opens, one after another, from a tool's own view down to one of its things: found the way
 * they would find it, by what each view lists. Nothing when no view of the tool leads there. */
function pathTo(tools: readonly Tool[], tool: string, on: string): readonly number[] | undefined {
  const seen = new Set<string>();
  let edge: readonly Reached[] = [{ rows: [] }];
  while (edge.length) {
    const deeper = edge.flatMap(from => opensFrom(tools, tool, from)).filter(to => !seen.has(to.target));
    const found = deeper.find(to => to.target === on);
    if (found) return found.rows;
    deeper.forEach(to => seen.add(to.target));
    edge = deeper;
  }
  return undefined;
}
/** From the Menu to where an act stands, by keys alone: its tool, then its thing by what each view opens. */
export function goTo<X extends Program>({ router, tools, shown }: Seat<X>, tool: string, on: string): void {
  const words = shown.words[tool];
  /** A tool that lives in another is opened from that one: its key is typed there. */
  const outer = words?.inside === undefined ? undefined : shown.words[words.inside];
  type(router, `${outer?.key ?? ""}${words?.key ?? ""}`);
  strictEqual(router.screen(view).title, words?.name);
  if (on === tool) return;
  const rows = pathTo(tools, tool, on);
  ok(rows, said.notListed(on));
  openRows(router, rows);
}
/** Every row of a place, the ones that cannot be chosen too; two of them taking one key is a defect of the screen. */
function rowsAt(tools: readonly Tool[], tool: string, target?: string): readonly Choice[] {
  const rows = stacksOf(placeOf(tool, target), tools).flatMap(stack => stack.rows);
  const keys = rows.flatMap(row => (row.key === undefined ? [] : [row.key]));
  strictEqual(new Set(keys).size, keys.length, said.sameKey(target ?? tool, keys));
  return rows;
}
/** An act's row as a person finds it: the rows to open from where the act stands, and the row itself. */
export type Found = Readonly<{ rows: readonly number[]; row: Choice }>;
/** The row that starts an act where its case does it: among the thing's own actions, or down any menu they open.
 * When the menu the act is under is off, that row stands for it. Nothing when no list a person can reach has it. */
export function actRow<X extends Program>(
  { tools }: Seat<X>,
  aim: Aim<X>,
  on: string,
  fits: (row: Choice) => boolean = () => true,
  from?: Readonly<{ tool: string; target: string }>,
): Found | undefined {
  const thing = on === aim.tool.id ? undefined : on;
  const menu = aim.act.under === undefined ? undefined : aim.tool.menus?.[aim.act.under];
  const starts = (row: Choice): boolean =>
    row.starts?.tool === aim.tool.id && row.starts.act === aim.name && row.starts.target === thing;
  const mine = (row: Choice): boolean =>
    (starts(row) && fits(row)) ||
    (row.off === true && menu !== undefined && row.key === menu.key && row.title === menu.name);
  /** Where the search starts: where the act stands, or the thing of another tool it is taken from. */
  const root = from ?? { tool: aim.tool.id, ...(thing === undefined ? {} : { target: thing }) };
  const seen = new Set<string | undefined>([root.target]);
  let edge: readonly Reached[] = [{ ...(root.target === undefined ? {} : { target: root.target }), rows: [] }];
  while (edge.length) {
    for (const { target, rows } of edge) {
      const row = rowsAt(tools, root.tool, target).find(mine);
      if (row) return { rows, row };
    }
    const deeper = edge.flatMap(at => opensFrom(tools, root.tool, at)).filter(to => !seen.has(to.target));
    deeper.forEach(to => seen.add(to.target));
    edge = deeper;
  }
  return undefined;
}
/** Opens, one after another, the rows that lead somewhere: each by moving onto it and confirming. */
export function openRows(router: Router, rows: readonly number[]): void {
  for (const at of rows) {
    for (let step = 0; step < at; step++) router.send({ kind: "down" });
    router.send({ kind: "confirm" });
  }
}
/** Every row of where a tool is listed, the tools that cannot be opened too: the Menu, or the tool it lives in. */
export const menuRows = (tools: readonly Tool[], inside?: string): readonly Choice[] =>
  stacksOf(inside === undefined ? { kind: "menu", at: 0 } : { kind: "view", tool: inside, at: 0 }, tools).flatMap(
    stack => stack.rows,
  );
