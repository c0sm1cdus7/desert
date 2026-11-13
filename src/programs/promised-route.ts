// Reach and answer a declared case through the same keys a person uses.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { addresses } from "../catalogs/addressing.ts";
import { asking } from "../surface/bridge/asking.ts";
import type { Field } from "../surface/contract.ts";
import type { Choice } from "../surface/screen.ts";
import { promiseTexts as said, promiseTexts as words } from "../texts/promises.texts.ts";
import type { Case } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { actRow, fitsSmallest, goTo, openRows, type, view, type Seat } from "./promised-keys.ts";
import { answer } from "./promised-answer.ts";
import { actionUnavailable } from "./availability/case-availability.ts";
import type { Aim } from "./promised-stage.ts";

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
export type Told<X extends Program> = Readonly<{ aim: Aim<X>; kase: Case<X>; answers: readonly string[] }> &
  /** The thing of another tool the case takes the act from, with the tool that has it. */
  Readonly<{ from?: Readonly<{ tool: string; target: string }> }>;
/** From the Menu to the act, and into it when it can be taken: by the key of its row, wherever its row is. Where
 * the tool itself says the act cannot be done now, its row has to be there all the same, off, saying exactly that:
 * then it is not taken. */
export function taken<X extends Program>(seat: Seat<X>, { aim, kase, answers, from }: Told<X>): Choice | undefined {
  const on = kase.on ?? aim.tool.id;
  goTo(seat, from?.tool ?? aim.tool.id, from?.target ?? on);
  fitsSmallest(seat.router);
  const found = actRow(seat, aim, on, fitting(answers), from);
  /** A refusal no row lets a person say cannot be broken from here; the act still has to be on some list. */
  if (!found && "refused" in kase.then && actRow(seat, aim, on, undefined, from)) return undefined;
  ok(found, said.notOffered(aim.name));
  const { row } = found;
  /** A row that already says everything the act takes knows what the act will answer: where that is a refusal,
   * the row is off saying it, as the tool itself would. Nobody is offered what is known to be refused. */
  const whole = row.with !== undefined && row.with.from >= answers.length;
  const closed = actionUnavailable(seat, aim, on, row.with?.answers.slice(0, row.with.from), from?.target);
  const cause = closed ?? (whole && "refused" in kase.then ? kase.then.refused : undefined);
  strictEqual(row.off ? whyOf(row, cause) : undefined, cause, said.offFor(aim.name));
  /** The right of an act is never empty: its datum, or what it is for. */
  ok(row.detail, said.saysNothing(aim.name));
  openRows(seat.router, found.rows);
  if (row.off) {
    const before = seat.router.screen(view);
    ok(row.key);
    type(seat.router, row.key);
    deepStrictEqual(seat.router.screen(view), before);
    return undefined;
  }
  const current = aim.act.today?.(seat.state(), on, seat.now());
  if (current !== undefined)
    deepStrictEqual(
      row.open?.kind === "act" ? row.open.was : undefined,
      asking(aim.act.input, seat.words).answers(current),
    );
  ok(row.key, said.keyless(aim.name));
  type(seat.router, row.key);
  return row;
}
/** Every answer the row asks of what the case says, given one by one to the questions the surface really asks.
 * False when a field stopped it: the surface did not let the person say what the case says. */
export function walk<X extends Program>(
  { router, tools }: Seat<X>,
  { aim, kase, answers }: Told<X>,
  row: Choice,
): boolean | "absent" {
  const absent: string[] = [];
  const tool = tools.find(known => known.id === aim.tool.id);
  const act = aim.act.on === "tool" ? tool?.acts[aim.name] : tool?.actsOn?.[aim.name];
  const next = (given: readonly string[]): Field | null => act?.next(given, kase.on ?? aim.tool.id) ?? null;
  const { from = 0, until = answers.length } = row.with ?? {};
  /** What the act says cannot go on stays at the question it was answered in: nothing more is asked or confirmed. */
  const stopped: string[] = [];
  const said = answers.slice(from, until).every((given, offset) => {
    if (stopped.length) return true;
    const field = next(answers.slice(0, from + offset));
    fitsSmallest(router);
    const taken = field
      ? answer(router, field, given, row.open?.kind === "act" ? row.open.answers[from + offset] : undefined)
      : true;
    if (taken === "absent") absent.push(given);
    const why = taken === true ? act?.stops?.(answers.slice(0, from + offset + 1), kase.on ?? aim.tool.id) : undefined;
    if (why !== undefined) stopped.push(why);
    return taken === true;
  });
  fitsSmallest(router);
  /** What asks to be confirmed is confirmed as a person does: by the initial of the act's own verb. */
  const sure = said && !stopped.length && row.with?.until === undefined ? next(answers) : null;
  if (sure) ok(!addresses(sure.ask), words.speaks(sure.ask));
  const promised = "refused" in kase.then ? undefined : kase.then.sure;
  if (sure && promised !== undefined) strictEqual(sure.ask, promised, words.notSure(sure.ask));
  if (sure) type(router, aim.act.enter.charAt(0));
  return absent.length ? "absent" : said;
}
