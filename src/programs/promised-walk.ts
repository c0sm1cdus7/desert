import { deepStrictEqual, ok } from "node:assert/strict";
import { asking } from "../surface/bridge/asking.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Case, Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { errorIn, linesIn } from "./read-screen.ts";
import { seated, view, type Seat } from "./promised-keys.ts";
import { taken, walk } from "./promised-route.ts";
import { assertOutcome, currentInState } from "./promised-result.ts";
import { quietly } from "./promised-entry.ts";
import { availabilityChecks } from "./promised-availability.ts";
import { choiceChecks } from "./promised-choices.ts";
import { currentCloses } from "./answers/current.ts";
import { findChecks } from "./promised-find.ts";
import { noticeChecks } from "./promised-notices.ts";
import { shownChecks } from "./promised-off.ts";
import { cast, given, label, staged, wroteSince, type Aim, type Check } from "./promised-stage.ts";
function assertReading<X extends Program>(seat: Seat<X>, kase: Case<X>): void {
  const screen = seat.router.screen(view).body;
  const promised = "refused" in kase.then ? kase.then.refused : kase.then.says;
  const text = `${"refused" in kase.then ? surface.error : surface.ok} ${promised}`;
  ok(
    linesIn(screen).some(line => line === text || line.startsWith(`${text} · `)),
    said.notSaid(promised),
  );
}
function walkCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const refused = "refused" in kase.then ? kase.then.refused : undefined;
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      const before = house().tools.state().through;
      try {
        const holder = program.registry.find(tool => tool.targets(house().tools.state()).includes(kase.from ?? ""));
        const from = kase.from !== undefined && holder ? { from: { tool: holder.id, target: kase.from } } : {};
        const told = { aim, kase, answers: asking(aim.act.input, seat.words).answers(kase.input), ...from };
        currentInState(seat, aim, kase);
        /** What is off said why, and what a field does not let be written cannot be sent: neither breaks a refusal. */
        const row = quietly(seat.router, router => taken({ ...seat, router }, told));
        if (row?.open?.kind === "act") currentCloses(seat.tools, row.open);
        const outcome = row !== undefined && quietly(seat.router, router => walk({ ...seat, router }, told, row));
        const done = outcome === true;
        ok(
          done || refused !== undefined,
          typeof outcome === "object" ? said.closedAt(outcome.kind, outcome.ask) : said.notOffered(aim.name),
        );
        /** What could not be taken or sent wrote nothing. */
        if (!done) deepStrictEqual(wroteSince(house(), before), []);
        await seat.router.idle();
        if (!assertOutcome(seat, aim, kase, outcome === false || outcome === true ? undefined : outcome)) return;
        assertReading(seat, kase);
        deepStrictEqual(wroteSince(house(), before), "refused" in kase.then ? [] : kase.then.facts, said.factsMismatch);
        /** Closing what was done leaves the person on a screen that exists: never on a thing its act took away. */
        seat.router.send({ kind: "cancel" });
        ok(!errorIn(seat.router.screen(view).body, surface.gone), said.lost(aim.name));
        ok(seat.defects.length === 0, seat.defects.join("\n"));
      } finally {
        seat.router.stop();
      }
    });
  return { name: label(aim, said.byKeys(kase.promise)), run };
}
/** Walk every case from the Menu and verify its visible choices, availability, data and notices. */
export function walkedChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  const cases = program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) =>
      act.cases.map(kase => walkCheck(program, shown, { tool, name, act }, kase)),
    ),
  );
  const derived = [choiceChecks, availabilityChecks, shownChecks, noticeChecks, findChecks];
  return [...cases, ...derived.flatMap(checks => checks(program, shown))];
}
