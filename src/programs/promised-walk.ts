// The same cases, walked by keys through the router every renderer uses: what a person does to keep each promise.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { caseInstant } from "../catalogs/time.ts";
import { asking } from "../surface/bridge/asking.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { houseTools } from "../surface/bridge/house-tools.ts";
import type { Field, Tool } from "../surface/contract.ts";
import { formats } from "../surface/masks.ts";
import { startRouter, type Router } from "../surface/router.ts";
import { choices } from "../surface/screen.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import type { Case, Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { localPorts } from "./house-runtime.ts";
import { cast, given, label, staged, wroteSince, type Aim, type Check } from "./promised.ts";

const view = { rows: 40 };
const bar = { state: "connected", clock: "00:00", now: caseInstant } as const;
const type = (router: Router, text: string): void => {
  for (const char of Array.from(text)) router.send({ kind: "type", text: char });
};
/** One answer as a person gives it: written and confirmed, or chosen by the key of its option. False when the
 * field itself does not take it: what cannot be written cannot be sent. */
function answer(router: Router, field: Field, given: string): boolean {
  if (field.kind === "text" || field.kind === "secret") {
    if (field.valid?.(given) === false) return false;
    Array.from(field.initial ?? "").forEach(() => router.send({ kind: "erase" }));
    type(router, given);
    router.send({ kind: "confirm" });
    return true;
  }
  const key = field.options.find(option => option.title === given)?.key;
  ok(key, said.noKey(field.ask, given));
  type(router, key);
  return true;
}
type Walked<X extends Program> = Readonly<{ aim: Aim<X>; kase: Case<X>; tools: readonly Tool[]; shown: Shown<X> }>;
type Reached = Readonly<{ target?: string; rows: readonly number[] }>;
/** What one view opens: each thing a row of it leads to, with the rows opened to get there. */
const opensFrom = (tools: readonly Tool[], tool: string, { target, rows }: Reached): Required<Reached>[] =>
  choices({ kind: "view", tool, at: 0, ...(target === undefined ? {} : { target }) }, tools).flatMap((row, at) =>
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
/** From the Menu to the act by keys alone: the tool, the thing its case names, then the act. False if not offered. */
function reach<X extends Program>(router: Router, { aim, kase, tools, shown }: Walked<X>): boolean {
  const words = shown.words[aim.tool.id];
  const on = kase.on ?? aim.tool.id;
  type(router, words?.key ?? "");
  strictEqual(router.screen(view).title, words?.name);
  if (on !== aim.tool.id) {
    const rows = pathTo(tools, aim.tool.id, on);
    ok(rows, said.notListed(on));
    for (const at of rows) {
      for (let step = 0; step < at; step++) router.send({ kind: "down" });
      router.send({ kind: "confirm" });
    }
  }
  const place = { kind: "view", tool: aim.tool.id, at: 0, ...(on === aim.tool.id ? {} : { target: on }) } as const;
  const offered = choices(place, tools).some(row => row.key === aim.act.key && row.title === aim.act.label);
  if (offered) type(router, aim.act.key);
  return offered;
}
/** Every answer the case's input needs, given one by one to the questions the surface really asks. False when a
 * field stopped it: the surface did not let the person say what the case says. */
function walk<X extends Program>(router: Router, { aim, kase, tools, shown }: Walked<X>): boolean {
  const words = { formats: formats(shown.locale), optionalMark: generic.optional };
  const answers = asking(aim.act.input, words).answers(kase.input);
  const tool = tools.find(known => known.id === aim.tool.id);
  const act = aim.act.on === "tool" ? tool?.acts[aim.name] : tool?.actsOn?.[aim.name];
  const next = (given: readonly string[]): Field | null => act?.next(given, kase.on ?? aim.tool.id) ?? null;
  const said = answers.every((given, index) => {
    const field = next(answers.slice(0, index));
    return field ? answer(router, field, given) : true;
  });
  if (said && next(answers)) type(router, aim.act.key);
  return said;
}
function walkCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const refused = "refused" in kase.then ? kase.then.refused : undefined;
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given);
      const ports = localPorts(house(), kase.by ?? cast.admin, { recentLines: 100 });
      const walked = { aim, kase, tools: houseTools(ports, shown), shown };
      const router = startRouter({ tools: walked.tools, bar: () => bar, changes: ports.watch });
      const before = house().tools.state().through;
      try {
        const offered = reach(router, walked);
        /** What the surface does not offer, or does not let be written, cannot break its promise from there. */
        const done = offered && walk(router, walked);
        ok(done || refused !== undefined, said.notOffered(aim.name));
        if (!done) return;
        await router.idle();
        const screen = JSON.stringify(router.screen(view).body);
        const words = "refused" in kase.then ? kase.then.refused : kase.then.says;
        ok(screen.includes(JSON.stringify(words).slice(1, -1)), said.notSaid(words));
        deepStrictEqual(wroteSince(house(), before), "refused" in kase.then ? [] : kase.then.facts);
      } finally {
        router.stop();
      }
    });
  return { name: label(aim, said.byKeys(kase.promise)), run };
}
/** Every case of every act, kept by keys from the Menu: that every act can be reached is checked by reaching it. */
export function walkedChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  return program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) =>
      act.cases.map(kase => walkCheck(program, shown, { tool, name, act }, kase)),
    ),
  );
}
