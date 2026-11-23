// A case's first unanswered reference must have somewhere to go, or its action stays disabled at the menu.
import { meant } from "../../../fields/phrases.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import { actionUnavailable, caseOrigin } from "./case-availability.ts";
import type { Composition, Case } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { promiseTexts } from "../../../texts/promises.texts.ts";
import { actRow, goTo, openRows, seated, type, view } from "../promised-keys.ts";
import { prefer } from "./promised-preferences.ts";
import { cast, given, label, staged, type Aim, type Check } from "../promised-stage.ts";
const availabilityCheck = <X extends Program>(
  program: Composition<X>,
  shown: Shown<X>,
  aim: Aim<X>,
  kase: Case<X>,
): Check => ({
  name: label(aim, promiseTexts.availableChoices(meant(kase.promise))),
  run: () =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      const on = kase.on ?? aim.tool.id;
      const from = caseOrigin(aim, kase);
      try {
        const reason = actionUnavailable(seat, aim, on, [], from?.target);
        if (reason === undefined) return;
        goTo(seat, from?.tool ?? aim.tool.id, from?.target ?? on);
        const found = actRow(seat, aim, on, undefined, from);
        ok(found, promiseTexts.availableLost);
        ok(found.row.off, promiseTexts.availableEnabled);
        ok(found.row.detail?.endsWith(seat.say(reason)));
        openRows(seat.router, found.rows);
        const before = seat.router.screen(view);
        ok(found.row.key);
        type(seat.router, found.row.key);
        deepStrictEqual(seat.router.screen(view), before);
        seat.router.send({ kind: "menu" });
        await prefer(seat, "off", true);
        strictEqual(actRow(seat, aim, on, undefined, from), undefined, promiseTexts.availableShown);
      } finally {
        seat.router.stop();
      }
    }),
});
export const availabilityChecks = <X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] =>
  program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) =>
      act.cases.map(kase => availabilityCheck(program, shown, { tool, name, act }, kase)),
    ),
  );
