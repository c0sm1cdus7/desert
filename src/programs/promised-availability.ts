// A case's first unanswered reference must have somewhere to go, or its action stays disabled at the menu.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { withoutChoices } from "../surface/bridge/picked.ts";
import type { Composition, Case } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { promiseTexts } from "../texts/promises.texts.ts";
import { actRow, goTo, openRows, seated, type, view, type Seat } from "./promised-keys.ts";
import { prefer } from "./promised-preferences.ts";
import { cast, given, label, staged, type Aim, type Check } from "./promised-stage.ts";

/** The actual first question, including any answers fixed by the row that offers the action. */
export function firstUnavailable<X extends Program>(
  seat: Seat<X>,
  aim: Aim<X>,
  on: string,
  answers: readonly string[] = [],
): string | undefined {
  const tool = seat.tools.find(tool => tool.id === aim.tool.id);
  const act = aim.act.on === "tool" ? tool?.acts[aim.name] : tool?.actsOn?.[aim.name];
  return withoutChoices(act?.next(answers, on) ?? null);
}
const availabilityCheck = <X extends Program>(
  program: Composition<X>,
  shown: Shown<X>,
  aim: Aim<X>,
  kase: Case<X>,
): Check => ({
  name: label(aim, promiseTexts.availableChoices(kase.promise)),
  run: () =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      const on = kase.on ?? aim.tool.id;
      try {
        const empty = firstUnavailable(seat, aim, on);
        if (empty === undefined) return;
        const reason = aim.act.offered?.(seat.state(), on, seat.now()) ?? empty;
        goTo(seat, aim.tool.id, on);
        const found = actRow(seat, aim, on);
        ok(found);
        ok(found.row.off);
        ok(found.row.detail?.endsWith(reason));
        openRows(seat.router, found.rows);
        const before = seat.router.screen(view);
        ok(found.row.key);
        type(seat.router, found.row.key);
        deepStrictEqual(seat.router.screen(view), before);
        seat.router.send({ kind: "menu" });
        await prefer(seat, "off", true);
        strictEqual(actRow(seat, aim, on), undefined);
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
