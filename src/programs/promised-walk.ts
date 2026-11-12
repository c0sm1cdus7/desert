// The same cases, walked by keys through the router every renderer uses: what a person does to keep each promise.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { addresses } from "../catalogs/addressing.ts";
import { asking } from "../surface/bridge/asking.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Field } from "../surface/contract.ts";
import { formats } from "../surface/masks.ts";
import type { Router } from "../surface/router.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { promiseTexts as said, promiseTexts as words } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Case, Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import type { Choice } from "../surface/screen.ts";
import { actRow, fitsSmallest, goTo, openRows, seated, type, view, type Seat } from "./promised-keys.ts";
import { findChecks } from "./promised-find.ts";
import { noticeChecks } from "./promised-notices.ts";
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
    /** What is complete and wrong stays where it was written, and the screen says why. */
    const why = field.wrong?.(given);
    if (why !== undefined) ok(JSON.stringify(router.screen(view).body).includes(why), said.notSaid(why));
    return why === undefined;
  }
  if (field.kind === "many") {
    /** Each option is marked or cleared with space until what is marked is what the case says. */
    const [marked, wanted] = [opened, given].map(each => (each === "" ? [] : each.split(" · ")));
    field.options.forEach((option, i) => {
      if (marked?.includes(option.title) !== wanted?.includes(option.title)) router.send({ kind: "type", text: " " });
      if (i < field.options.length - 1) router.send({ kind: "down" });
    });
    router.send({ kind: "confirm" });
    return true;
  }
  if (field.kind === "pick") {
    if (field.valid?.(given) === false) return false;
    /** The thing is looked for as on any menu: space, then its name; and taken where it shows among what is found. */
    const name = given === "" ? "" : field.shown(given);
    if (name !== "") type(router, ` ${name}`);
    const at = field.found(name).findIndex(option => (option.value ?? option.title) === given);
    ok(at >= 0, said.notFound(name));
    /** What is not looked for is taken by its number: the cursor stands on what the datum already is, not first. */
    if (name === "" && at < 9) return (type(router, String(at + 1)), true);
    for (let step = 0; step < at; step++) router.send({ kind: "down" });
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
    const { from, until } = given;
    const fixed = (index: number): boolean => index < from || (until !== undefined && index >= until);
    return answers.every((said, i) => !fixed(i) || given.answers[i] === said);
  };
/** Why a row says it is off: a row that reads a datum keeps saying it, and says why after it. */
const whyOf = ({ detail }: Choice, cause?: string): string | undefined =>
  cause !== undefined && detail?.endsWith(` · ${cause}`) ? cause : detail;
type Told<X extends Program> = Readonly<{ aim: Aim<X>; kase: Case<X>; answers: readonly string[] }> &
  /** The thing of another tool the case takes the act from, with the tool that has it. */
  Readonly<{ from?: Readonly<{ tool: string; target: string }> }>;
/** From the Menu to the act, and into it when it can be taken: by the key of its row, wherever its row is. Where
 * the tool itself says the act cannot be done now, its row has to be there all the same, off, saying exactly that:
 * then it is not taken. */
function taken<X extends Program>(seat: Seat<X>, { aim, kase, answers, from }: Told<X>): Choice | undefined {
  const on = kase.on ?? aim.tool.id;
  goTo(seat, from?.tool ?? aim.tool.id, from?.target ?? on);
  fitsSmallest(seat.router);
  const found = actRow(seat, aim, on, fitting(answers), from);
  /** A refusal no row lets a person say cannot be broken from here; the act still has to be on some list. */
  if (!found && "refused" in kase.then && actRow(seat, aim, on, undefined, from)) return undefined;
  ok(found, said.notOffered(aim.name));
  const { row } = found;
  /** Taken from the thing of another tool, it is that thing that may say why not. */
  const told = from ? aim.act.also?.off?.(seat.state(), from.target) : aim.act.offered?.(seat.state(), on);
  /** A row that already says everything the act takes knows what the act will answer: where that is a refusal,
   * the row is off saying it, as the tool itself would. Nobody is offered what is known to be refused. */
  const whole = row.with !== undefined && row.with.from >= answers.length;
  const cause = told ?? (whole && "refused" in kase.then ? kase.then.refused : undefined);
  strictEqual(row.off ? whyOf(row, cause) : undefined, cause, said.offFor(aim.name));
  /** The right of an act is never empty: its datum, or what it is for. */
  ok(row.detail, said.saysNothing(aim.name));
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
  /** A row that asks the one datum it reads does not send what the thing already says: nothing would change. */
  if (row.with?.today === true && until - from === 1 && row.with.answers[from] === answers[from]) return false;
  /** What the act says cannot go on stays at the question it was answered in: nothing more is asked or confirmed. */
  const stopped: string[] = [];
  const said = answers.slice(from, until).every((given, offset) => {
    if (stopped.length) return true;
    const field = next(answers.slice(0, from + offset));
    fitsSmallest(router);
    const taken = field ? answer(router, field, given, row.with?.answers[from + offset]) : true;
    const why = taken ? act?.stops?.(answers.slice(0, from + offset + 1), kase.on ?? aim.tool.id) : undefined;
    if (why !== undefined) stopped.push(why);
    return taken;
  });
  fitsSmallest(router);
  /** What asks to be confirmed is confirmed as a person does: by the initial of the act's own verb. */
  const sure = said && !stopped.length && row.with?.until === undefined ? next(answers) : null;
  if (sure) ok(!addresses(sure.ask), words.speaks(sure.ask));
  const promised = "refused" in kase.then ? undefined : kase.then.sure;
  if (sure && promised !== undefined) strictEqual(sure.ask, promised, words.notSure(sure.ask));
  if (sure) type(router, aim.act.enter.charAt(0));
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
        const holder = program.registry.find(tool => tool.targets(house().tools.state()).includes(kase.from ?? ""));
        const from = kase.from !== undefined && holder ? { from: { tool: holder.id, target: kase.from } } : {};
        const told = { aim, kase, answers: asking(aim.act.input, words).answers(kase.input), ...from };
        /** What is off said why, and what a field does not let be written cannot be sent: neither breaks a refusal. */
        const row = taken(seat, told);
        const done = row !== undefined && walk(seat, told, row);
        ok(done || refused !== undefined, said.notOffered(aim.name));
        /** What could not be taken or sent wrote nothing. */
        if (!done) deepStrictEqual(wroteSince(house(), before), []);
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
  return [...cases, ...shownChecks(program, shown), ...noticeChecks(program, shown), ...findChecks(program, shown)];
}
