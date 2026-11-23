// The same cases, walked by keys through the router every renderer uses: what a person does to keep each promise.
import { meant } from "../../../fields/phrases.ts";
import { directRefusal } from "./fixed-entries.ts";
import { deepStrictEqual, ok } from "node:assert/strict";
import { asking } from "../../../surface/bridge/questions/asking.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import { promiseTexts as said } from "../../../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../../../texts/surface.texts.ts";
import type { Case, Composition } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { errorIn, linesIn } from "../../read-screen.ts";
import { seated, view, type Seat } from "../promised-keys.ts";
import { missingAt, takenOrConstructed, walk, type Told } from "./promised-route.ts";
import { assertOutcome, currentInState } from "./promised-result.ts";
import { quietly } from "../answers/promised-entry.ts";
import { currentCloses } from "../answers/current.ts";
import { cast, given, label, staged, wroteSince, type Aim, type Check, type House } from "../promised-stage.ts";
/** Capture the missing question before a faulty direct call could alter the case state. */
async function closedConstruction<X extends Program>(
  house: House<X>,
  seat: Seat<X>,
  told: Told<X>,
  before: number,
): Promise<string> {
  const ask = missingAt(seat, told);
  deepStrictEqual(wroteSince(house, before), []);
  ok(seat.requests.length === 0, said.internalSent);
  try {
    await directRefusal(house, told);
  } catch (error) {
    throw new Error(`${said.missingPath(ask)}. ${String(error)}`);
  }
  await seat.router.idle();
  ok(seat.defects.length === 0, seat.defects.join("\n"));
  return said.constructed;
}
function assertReading<X extends Program>(seat: Seat<X>, kase: Case<X>): void {
  const screen = seat.router.screen(view).body;
  const promised = "refused" in kase.then ? kase.then.refused : kase.then.says;
  const text = `${seat.say("refused" in kase.then ? surface.error : surface.ok)} ${seat.say(promised)}`;
  ok(
    linesIn(screen).some(line => line === text || line.startsWith(`${text} · `)),
    said.notSaid(meant(promised)),
  );
}
/** A completed act leaves its promised facts and a surviving place to return to. */
function completed<X extends Program>(house: House<X>, seat: Seat<X>, aim: Aim<X>, kase: Case<X>, before: number) {
  assertReading(seat, kase);
  deepStrictEqual(wroteSince(house, before), "refused" in kase.then ? [] : kase.then.facts, said.factsMismatch);
  /** Closing what was done leaves the person on a screen that exists: never on a thing its act took away. */
  seat.router.send({ kind: "cancel" });
  ok(!errorIn(seat.router.screen(view).body, surface.gone, seat.language), said.lost(aim.name));
  ok(seat.defects.length === 0, seat.defects.join("\n"));
}
/** Checks retain their closure message for reporters without writing to the terminal. */
const reporting = (run: () => Promise<void>, report: (text: string | undefined) => void) => async (): Promise<void> => {
  report(undefined);
  try {
    await run();
  } catch (error) {
    report(error instanceof Error ? error.message : String(error));
    throw error;
  }
};
/** Keep the screen's closure separate from preparing and disposing the case's house. */
async function runCase<X extends Program>(house: House<X>, seat: Seat<X>, told: Told<X>): Promise<string | undefined> {
  const { aim, kase } = told;
  const refused = "refused" in kase.then;
  const before = house.tools.state().through;
  currentInState(seat, aim, kase);
  /** What is off said why, and what a field does not let be written cannot be sent: neither breaks a refusal. */
  const row = quietly(seat.router, router => takenOrConstructed({ ...seat, router }, told));
  if (row === "construction") return closedConstruction(house, seat, told, before);
  if (row?.open?.kind === "act") currentCloses(seat.tools, row.open, seat.language);
  const outcome = row !== undefined && quietly(seat.router, router => walk({ ...seat, router }, told, row));
  const done = outcome === true;
  ok(
    done || refused,
    typeof outcome === "object" ? said.closedAt(outcome.kind, outcome.ask) : said.notOffered(aim.name),
  );
  /** What could not be taken or sent wrote nothing. */
  if (!done) deepStrictEqual(wroteSince(house, before), []);
  await seat.router.idle();
  if (assertOutcome(seat, aim, kase, typeof outcome === "object" ? outcome : undefined))
    completed(house, seat, aim, kase, before);
  if (!refused) return undefined;
  return done ? said.externalResult : said.closure(typeof outcome === "object" ? outcome.kind : "cause");
}
export function walkCheck<X extends Program>(
  program: Composition<X>,
  shown: Shown<X>,
  aim: Aim<X>,
  kase: Case<X>,
): Check {
  let report: string | undefined;
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      try {
        const holder = program.registry.find(tool => tool.targets(house().tools.state()).includes(kase.from ?? ""));
        const from = kase.from !== undefined && holder ? { from: { tool: holder.id, target: kase.from } } : {};
        const told = { aim, kase, answers: asking(aim.act.input, seat.words).answers(kase.input), ...from };
        report = await runCase(house(), seat, told);
      } finally {
        seat.router.stop();
      }
    });
  return {
    name: label(aim, said.byKeys(meant(kase.promise))),
    run: reporting(run, value => {
      report = value;
    }),
    report: () => report,
  };
}
