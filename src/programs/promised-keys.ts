// How a derived check moves through a program by keys: from the Menu to a tool, to one of its things, to an act's row.
import { ok, strictEqual } from "node:assert/strict";
import { caseInstant } from "../catalogs/time.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { houseTools } from "../surface/bridge/house-tools.ts";
import type { Tool } from "../surface/contract.ts";
import { startRouter, type Router } from "../surface/router.ts";
import { choices, stacksOf, type Choice } from "../surface/screen.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import type { Program } from "../tools/tool-contract.ts";
import { localPorts } from "./house-runtime.ts";
import type { Aim, House } from "./promised-stage.ts";

export const view = { rows: 40 };
const bar = { state: "connected", clock: "00:00", now: caseInstant } as const;
export const type = (router: Router, text: string): void => {
  for (const char of Array.from(text)) router.send({ kind: "type", text: char });
};
/** A program as one identity has it in front: its tools as that identity sees them, and a router on the Menu. */
export function seated<X extends Program>(house: House<X>, by: string, shown: Shown<X>) {
  const ports = localPorts(house, by, { recentLines: 100 });
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
    row.opens !== undefined && row.open?.kind === "view" ? [{ target: row.opens, rows: [...rows, at] }] : [],
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
  type(router, words?.key ?? "");
  strictEqual(router.screen(view).title, words?.name);
  if (on === tool) return;
  const rows = pathTo(tools, tool, on);
  ok(rows, said.notListed(on));
  for (const at of rows) {
    for (let step = 0; step < at; step++) router.send({ kind: "down" });
    router.send({ kind: "confirm" });
  }
}
/** The row of an act where it stands, whether it can be chosen now or not; nothing when it is not on the list. */
export const actRow = <X extends Program>({ tools }: Seat<X>, aim: Aim<X>, on: string): Choice | undefined =>
  stacksOf(placeOf(aim.tool.id, on === aim.tool.id ? undefined : on), tools)
    .flatMap(stack => stack.rows)
    .find(row => row.key === aim.act.key && row.title === aim.act.label);
/** Every row of the Menu, the tools that cannot be opened too. */
export const menuRows = (tools: readonly Tool[]): readonly Choice[] =>
  stacksOf({ kind: "menu", at: 0 }, tools).flatMap(stack => stack.rows);
