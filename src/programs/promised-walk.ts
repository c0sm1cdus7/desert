// The same cases, walked by keys through the router every renderer uses: what a person does to keep each promise.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { asking } from "../surface/bridge/asking.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Field } from "../surface/contract.ts";
import { formats } from "../surface/masks.ts";
import type { Router } from "../surface/router.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Case, Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import type { Choice } from "../surface/lists.ts";
import { actRow, goTo, openRows, seated, type, view, type Seat } from "./promised-keys.ts";
import { shownChecks } from "./promised-off.ts";
import { cast, given, label, staged, wroteSince, type Aim, type Check } from "./promised-stage.ts";

/** One answer as a person gives it: written over what the field opened on and confirmed, or chosen by the key of
 * its option. False when the field itself does not take it: what cannot be written cannot be sent. */
function answer(router: Router, field: Field, given: string, opened = field.initial ?? ""): boolean {
  if (field.kind === "text" || field.kind === "secret") {
    if (field.valid?.(given) === false) return false;
    Array.from(opened).forEach(() => router.send({ kind: "erase" }));
    type(router, given);
    router.send({ kind: "confirm" });
    return true;
  }
  const key = field.options.find(option => option.title === given)?.key;
  ok(key, said.noKey(field.ask, given));
  type(router, key);
  return true;
}
/** Whether a row starts the act with what the case says: what the row does not ask has to be the case's already. */
const fitting =
  (answers: readonly string[]) =>
  ({ with: given }: Choice): boolean => {
    if (!given) return true;
    const { from, until = given.answers.length } = given;
    const fixed = (index: number): boolean => index < from || index >= until;
    return (
      given.answers.length === answers.length && answers.every((said, i) => !fixed(i) || given.answers[i] === said)
    );
  };
type Told<X extends Program> = Readonly<{ aim: Aim<X>; kase: Case<X>; answers: readonly string[] }>;
/** From the Menu to the act, and into it when it can be taken: by the key of its row, wherever its row is. Where
 * the tool itself says the act cannot be done now, its row has to be there all the same, off, saying exactly that:
 * then it is not taken. */
function taken<X extends Program>(seat: Seat<X>, { aim, kase, answers }: Told<X>): Choice | undefined {
  const on = kase.on ?? aim.tool.id;
  goTo(seat, aim.tool.id, on);
  const found = actRow(seat, aim, on, fitting(answers));
  /** A refusal no row lets a person say cannot be broken from here; the act still has to be on some list. */
  if (!found && "refused" in kase.then && actRow(seat, aim, on)) return undefined;
  ok(found, said.notOffered(aim.name));
  const { row } = found;
  strictEqual(row.off ? row.detail : undefined, aim.act.offered?.(seat.state(), on), said.offFor(aim.name));
  if (row.off) return undefined;
  openRows(seat.router, found.rows);
  ok(row.key, said.keyless(aim.name));
  type(seat.router, row.key);
  return row;
}
/** Every answer the row asks of what the case says, given one by one to the questions the surface really asks.
 * False when a field stopped it: the surface did not let the person say what the case says. */
function walk<X extends Program>({ router, tools }: Seat<X>, { aim, kase, answers }: Told<X>, row: Choice): boolean {
  const tool = tools.find(known => known.id === aim.tool.id);
  const act = aim.act.on === "tool" ? tool?.acts[aim.name] : tool?.actsOn?.[aim.name];
  const next = (given: readonly string[]): Field | null => act?.next(given, kase.on ?? aim.tool.id) ?? null;
  const { from = 0, until = answers.length } = row.with ?? {};
  const said = answers.slice(from, until).every((given, offset) => {
    const field = next(answers.slice(0, from + offset));
    return field ? answer(router, field, given, row.with?.answers[from + offset]) : true;
  });
  if (said && row.with?.until === undefined && next(answers)) type(router, aim.act.key);
  return said;
}
function walkCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const refused = "refused" in kase.then ? kase.then.refused : undefined;
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given);
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      const before = house().tools.state().through;
      try {
        const words = { formats: formats(shown.locale), optionalMark: generic.optional };
        const told = { aim, kase, answers: asking(aim.act.input, words).answers(kase.input) };
        /** What is off said why, and what a field does not let be written cannot be sent: neither breaks a refusal. */
        const row = taken(seat, told);
        const done = row !== undefined && walk(seat, told, row);
        ok(done || refused !== undefined, said.notOffered(aim.name));
        if (!done) return;
        await seat.router.idle();
        const screen = JSON.stringify(seat.router.screen(view).body);
        const promised = "refused" in kase.then ? kase.then.refused : kase.then.says;
        ok(screen.includes(JSON.stringify(promised).slice(1, -1)), said.notSaid(promised));
        deepStrictEqual(wroteSince(house(), before), "refused" in kase.then ? [] : kase.then.facts);
        /** Closing what was done leaves the person on a screen that exists: never on a thing its act took away. */
        seat.router.send({ kind: "cancel" });
        ok(!JSON.stringify(seat.router.screen(view).body).includes(surface.gone), said.lost(aim.name));
      } finally {
        seat.router.stop();
      }
    });
  return { name: label(aim, said.byKeys(kase.promise)), run };
}
/** Every case of every act, kept by keys from the Menu: that every act can be reached is checked by reaching it.
 * And what each person sees of what they cannot do. */
export function walkedChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  const cases = program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) =>
      act.cases.map(kase => walkCheck(program, shown, { tool, name, act }, kase)),
    ),
  );
  return [...cases, ...shownChecks(program, shown)];
}
