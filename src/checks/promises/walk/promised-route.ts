// Reach and answer a declared case through the same keys a person uses.
import { meant } from "../../../fields/phrases.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { asking } from "../../../surface/bridge/questions/asking.ts";
import type { Field } from "../../../surface/contract/contract.ts";
import { fieldOf, type Choice } from "../../../surface/session/screen.ts";
import { addresses } from "../../../texts/addressing.ts";
import { catalogLawTexts } from "../../../texts/catalog-laws.texts.ts";
import { deviceTexts } from "../../../texts/devices.texts.ts";
import { promiseTexts as said, promiseTexts as words } from "../../../texts/promises.texts.ts";
import type { Case } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { readThrough, rowsIn } from "../../read-screen.ts";
import { answer, type Stopped } from "../answers/promised-answer.ts";
import { actionUnavailable } from "../off/case-availability.ts";
import { actRow, fitsSmallest, goTo, openRows, type, view, type Seat } from "../promised-keys.ts";
import type { Aim } from "../promised-stage.ts";
import { proveConstruction } from "./fixed-entries.ts";
/** Whether a row starts the act with what the case says: what the row does not ask has to be the case's already. */
const fitting =
  (answers: readonly string[]) =>
  ({ with: fixed }: Choice): boolean =>
    fixed === undefined ||
    answers.every(
      (answer, at) =>
        (at >= fixed.from && (fixed.until === undefined || at < fixed.until)) || fixed.answers[at] === answer,
    );
/** Name the fixed question that prevents this case from fitting any entry row. */
export function missingAt<X extends Program>(seat: Seat<X>, told: Told<X>): string {
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
  return (
    asking(aim.act.input, seat.words).next(answers.slice(0, Math.max(at, 0)), kase.on ?? aim.tool.id)?.ask ??
    seat.say(aim.act.name)
  );
}
/** Why a row says it is off: a row that reads a datum keeps saying it, and says why after it. */
const whyOf = ({ detail }: Choice, cause?: string): string | undefined =>
  cause !== undefined && detail?.endsWith(` · ${cause}`) ? cause : detail;
export type Told<X extends Program> = Readonly<{ aim: Aim<X>; kase: Case<X>; answers: readonly string[] }> &
  /** The thing of another tool the case takes the act from, with the tool that has it. */
  Readonly<{ from?: Readonly<{ tool: string; target: string }> }>;
/** From the Menu to the act, and into it when it can be taken: by the key of its row, wherever its row is. Where
 * the tool itself says the act cannot be done now, its row has to be there all the same, off, saying exactly that:
 * then it is not taken. */
export function takenOrConstructed<X extends Program>(
  seat: Seat<X>,
  { aim, kase, answers, from }: Told<X>,
): Choice | "construction" | undefined {
  const on = kase.on ?? aim.tool.id;
  goTo(seat, from?.tool ?? aim.tool.id, from?.target ?? on);
  fitsSmallest(seat.router);
  const found = actRow(seat, aim, on, fitting(answers), from);
  /** A missing route needs positive evidence from every entry, including foreign ones. */
  if (!found) {
    const ask = missingAt(seat, { aim, kase, answers, ...(from === undefined ? {} : { from }) });
    return proveConstruction(seat, { aim, kase, answers }, ask);
  }
  const { row } = found;
  /** A row that already says everything the act takes knows what the act will answer: where that is a refusal,
   * the row is off saying it, as the tool itself would. Nobody is offered what is known to be refused. */
  const whole = row.with !== undefined && row.with.from >= answers.length;
  const closed = actionUnavailable(seat, aim, on, row.with?.answers.slice(0, row.with.from), from?.target);
  const reason = closed ?? (whole && "refused" in kase.then ? kase.then.refused : undefined);
  const cause = reason === undefined ? undefined : seat.say(reason);
  strictEqual(row.off ? whyOf(row, cause) : undefined, cause, said.offFor(aim.name));
  /** The right of an act is never empty: its datum, or what it is for. */
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
/** Every answer the row asks of what the case says, given one by one to the questions the surface really asks.
 * A stopped answer records whether a datum or a declared cause closes the question. */
export function walk<X extends Program>(
  { router, tools, say }: Seat<X>,
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
    /** What the act says cannot go on stays at the question it was answered in: nothing more is asked or confirmed. */
    const why = act?.stops?.(answers.slice(0, position + 1), kase.on ?? aim.tool.id);
    if (why !== undefined) return { kind: "cause", ask: field.ask };
  }
  const destination = walkDestination(router, next, aim, kase, answers, say);
  if (!Array.isArray(destination)) return destination;
  answers = destination;

  fitsSmallest(router);
  /** What asks to be confirmed is confirmed as a person does: by the initial of the act's own verb. */
  const sure = row.with?.until === undefined ? next(answers) : null;
  if (sure) ok(!addresses(sure.ask), words.speaks(sure.ask));
  const promised = "refused" in kase.then ? undefined : kase.then.sure;
  if (sure && promised !== undefined) strictEqual(sure.ask, say(promised), words.notSure(sure.ask));
  if (sure) type(router, say(aim.act.enter).charAt(0));
  return true;
}

function walkDestination<X extends Program>(
  router: Seat<X>["router"],
  next: (answers: readonly string[]) => Field | null,
  aim: Aim<X>,
  kase: Case<X>,
  answers: readonly string[],
  say: Seat<X>["say"],
): string[] | Stopped {
  if (!aim.act.execution || aim.act.execution.at === "house") return [...answers];
  {
    const field = next(answers);
    ok(field?.kind === "pick", meant(catalogLawTexts.destinationQuestion));
    const destination = kase.destination;
    ok(destination, meant(catalogLawTexts.caseDestination));
    const selected =
      destination.kind === "house"
        ? say(deviceTexts.house)
        : field
            .found("")
            .find(option => option.title === deviceTexts.deviceChoice(destination.device, destination.device))?.title;
    ok(selected, meant(catalogLawTexts.destinationRow));
    const outcome = answer(router, field, selected);
    if (outcome !== true) return outcome;
    return [...answers, selected];
  }
}
