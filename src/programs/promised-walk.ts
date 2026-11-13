// The same cases, walked by keys through the router every renderer uses: what a person does to keep each promise.
import { deepStrictEqual, ok } from "node:assert/strict";
import { asking } from "../surface/bridge/asking.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { formats } from "../surface/masks.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Case, Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { seated, view } from "./promised-keys.ts";
import { taken, walk } from "./promised-route.ts";
import { assertOutcome, currentInState } from "./promised-result.ts";
import { quietly } from "./promised-entry.ts";
import { availabilityChecks } from "./promised-availability.ts";
import { choiceChecks } from "./promised-choices.ts";
import { currentCloses } from "./promised-current.ts";
import { findChecks } from "./promised-find.ts";
import { noticeChecks } from "./promised-notices.ts";
import { shownChecks } from "./promised-off.ts";
import { cast, given, label, staged, wroteSince, type Aim, type Check } from "./promised-stage.ts";

function walkCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const refused = "refused" in kase.then ? kase.then.refused : undefined;
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      const before = house().tools.state().through;
      try {
        const words = { formats: formats(shown.locale), optionalMark: generic.optional };
        const holder = program.registry.find(tool => tool.targets(house().tools.state()).includes(kase.from ?? ""));
        const from = kase.from !== undefined && holder ? { from: { tool: holder.id, target: kase.from } } : {};
        const told = { aim, kase, answers: asking(aim.act.input, words).answers(kase.input), ...from };
        currentInState(seat, aim, kase);
        /** What is off said why, and what a field does not let be written cannot be sent: neither breaks a refusal. */
        const row = quietly(seat.router, router => taken({ ...seat, router }, told));
        if (row?.open?.kind === "act") currentCloses(seat.tools, row.open);
        const outcome = row !== undefined && quietly(seat.router, router => walk({ ...seat, router }, told, row));
        const done = outcome === true;
        ok(done || refused !== undefined, said.notOffered(aim.name));
        /** What could not be taken or sent wrote nothing. */
        if (!done) deepStrictEqual(wroteSince(house(), before), []);
        await seat.router.idle();
        if (!assertOutcome(seat, aim, kase, outcome === "absent")) return;
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
  return [
    ...cases,
    ...choiceChecks(program, shown),
    ...availabilityChecks(program, shown),
    ...shownChecks(program, shown),
    ...noticeChecks(program, shown),
    ...findChecks(program, shown),
  ];
}
