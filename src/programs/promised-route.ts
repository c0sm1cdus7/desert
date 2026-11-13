// Reach and answer a declared case through the same keys a person uses.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { addresses } from "../catalogs/addressing.ts";
import { asking } from "../surface/bridge/asking.ts";
import type { Field } from "../surface/contract.ts";
import { fieldOf, type Choice } from "../surface/screen.ts";
import { promiseTexts as said, promiseTexts as words } from "../texts/promises.texts.ts";
import type { Case } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { actRow, fitsSmallest, goTo, openRows, type, view, type Seat } from "./promised-keys.ts";
import { readThrough, rowsIn } from "./read-screen.ts";
import { answer, type Stopped } from "./promised-answer.ts";
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
/** Name the fixed question that prevents this case from fitting any entry row. */
function missingAt<X extends Program>(seat: Seat<X>, told: Told<X>): string {
  const { aim, kase, answers, from } = told;
  const row = actRow(seat, aim, kase.on ?? aim.tool.id, undefined, from)?.row;
  const fixed = row?.with;
  const at =
    fixed === undefined
      ? 0
      : answers.findIndex(
          (answer, index) =>
            (index < fixed.from || (fixed.until !== undefined && index >= fixed.until)) &&
            fixed.answers[index] !== answer,
        );
  return asking(aim.act.input, seat.words).next(answers.slice(0, Math.max(at, 0)))?.ask ?? aim.act.name;
}
const whyOf = ({ detail }: Choice, cause?: string): string | undefined =>
  cause !== undefined && detail?.endsWith(` · ${cause}`) ? cause : detail;
export type Told<X extends Program> = Readonly<{ aim: Aim<X>; kase: Case<X>; answers: readonly string[] }> &
  /** The thing of another tool the case takes the act from, with the tool that has it. */
  Readonly<{ from?: Readonly<{ tool: string; target: string }> }>;
/** Reach the row by keys; a declared closure stays visible with its exact cause and cannot be taken. */
export function taken<X extends Program>(seat: Seat<X>, { aim, kase, answers, from }: Told<X>): Choice | undefined {
  const on = kase.on ?? aim.tool.id;
  goTo(seat, from?.tool ?? aim.tool.id, from?.target ?? on);
  fitsSmallest(seat.router);
  const found = actRow(seat, aim, on, fitting(answers), from);
  /** No compatible row is evidence of a missing path, never proof of a refusal. */
  if (!found) {
    const ask = missingAt(seat, { aim, kase, answers, ...(from === undefined ? {} : { from }) });
    ok(found, `${said.notOffered(aim.name)}. ${said.missingPath(ask)}`);
  }
  const { row } = found;
  /** A complete fixed input already knows its refusal, which belongs on the disabled row. */
  const whole = row.with !== undefined && row.with.from >= answers.length;
  const closed = actionUnavailable(seat, aim, on, row.with?.answers.slice(0, row.with.from), from?.target);
  const cause = closed ?? (whole && "refused" in kase.then ? kase.then.refused : undefined);
  strictEqual(row.off ? whyOf(row, cause) : undefined, cause, said.offFor(aim.name));
  ok(row.detail, said.saysNothing(aim.name));
  openRows(seat.router, found.rows);
  ok(
    readThrough(seat.router, screen =>
      rowsIn(screen.body).some(
        visible => visible.title === row.title && visible.detail === row.detail && visible.key === row.key,
      ),
    ),
    said.notSaid(row.title),
  );
  if (row.off) {
    const before = seat.router.screen(view);
    ok(row.key);
    type(seat.router, row.key);
    deepStrictEqual(seat.router.screen(view), before);
    return undefined;
  }
  assertInitial(seat, aim, row, on);
  ok(row.key, said.keyless(aim.name));
  type(seat.router, row.key);
  return row;
}
function assertInitial<X extends Program>(seat: Seat<X>, aim: Aim<X>, row: Choice, on: string): void {
  const current = aim.act.today?.(seat.state(), on, seat.now());
  if (current !== undefined)
    deepStrictEqual(
      row.open?.kind === "act" ? row.open.was : undefined,
      asking(aim.act.input, seat.words).answers(current),
    );
}
/** Answer actual questions in order, preserving whether a datum or a declared cause closes the path. */
export function walk<X extends Program>(
  { router, tools }: Seat<X>,
  { aim, kase, answers }: Told<X>,
  row: Choice,
): true | Stopped {
  const tool = tools.find(known => known.id === aim.tool.id);
  const act = aim.act.on === "tool" ? tool?.acts[aim.name] : tool?.actsOn?.[aim.name];
  const next = (given: readonly string[]): Field | null => act?.next(given, kase.on ?? aim.tool.id) ?? null;
  const { from = 0, until = answers.length } = row.with ?? {};
  for (const [offset, value] of answers.slice(from, until).entries()) {
    const position = from + offset;
    const field =
      row.open?.kind === "act"
        ? fieldOf(tools, { ...row.open, answers: answers.slice(0, position), pos: position })
        : next(answers.slice(0, position));
    fitsSmallest(router);
    if (!field) continue;
    const opened = row.open?.kind === "act" ? row.open.answers[position] : undefined;
    const result = answer(router, field, value, opened);
    if (result !== true) return result;
    const why = act?.stops?.(answers.slice(0, position + 1), kase.on ?? aim.tool.id);
    if (why !== undefined) return { kind: "cause", ask: field.ask };
  }
  fitsSmallest(router);
  /** What asks to be confirmed is confirmed as a person does: by the initial of the act's own verb. */
  const sure = row.with?.until === undefined ? next(answers) : null;
  if (sure) ok(!addresses(sure.ask), words.speaks(sure.ask));
  const promised = "refused" in kase.then ? undefined : kase.then.sure;
  if (sure && promised !== undefined) strictEqual(sure.ask, promised, words.notSure(sure.ask));
  if (sure) type(router, aim.act.enter.charAt(0));
  return true;
}
