import { ok, strictEqual } from "node:assert/strict";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Case, Composition, ProgramTool } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import type { Screen } from "../surface/contract.ts";
import type { Choice } from "../surface/screen.ts";
import { readThrough, rowsIn } from "./read-screen.ts";
import { actRow, goTo, menuRows, seated, type, view } from "./promised-keys.ts";
import { prefer } from "./promised-preferences.ts";
export { prefer } from "./promised-preferences.ts";
import { actionUnavailable, caseOrigin } from "./availability/case-availability.ts";
import { cast, given, label, staged, type Aim, type Check } from "./promised-stage.ts";
/** Foreign tools stay disabled with their reason until hidden by preference; showing them restores them. */
function foreignCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, tool: ProgramTool<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      const seat = seated(house(), cast.outsider, shown);
      const key = shown.words[tool.id]?.key ?? "";
      const row = () => menuRows(seat.tools, shown.words[tool.id]?.inside).find(listed => listed.key === key);
      try {
        ok(row()?.off, said.notOnMenu(tool.id));
        strictEqual(row()?.detail, generic.notHeld);
        type(seat.router, key);
        strictEqual(seat.router.screen(view).title, surface.menu);
        await prefer(seat, "foreign", true);
        strictEqual(row(), undefined, said.stillShown(tool.id));
        await prefer(seat, "foreign", false);
        ok(row()?.off, said.notOnMenu(tool.id));
      } finally {
        seat.router.stop();
      }
    });
  return { name: `${tool.id} · ${said.foreign}`, run };
}
const readBy = ({ detail }: Choice, cause?: string): string | undefined =>
  cause !== undefined && detail?.endsWith(` · ${cause}`) ? detail.slice(0, -cause.length - 3) : undefined;
/** Hiding removes unavailable actions, keeps their data, and showing restores the actions. */
function hiddenCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      const on = kase.on ?? aim.tool.id;
      const from = caseOrigin(aim, kase);
      try {
        const original = actRow(seat, aim, on, undefined, from);
        ok(original, said.notOffered(aim.name));
        const cause = actionUnavailable(seat, aim, on, [], from?.target);
        const read = readBy(original.row, cause);
        await prefer(seat, "off", true);
        const target = read === undefined ? (from?.target ?? on) : (original.target ?? from?.target ?? on);
        goTo(seat, from?.tool ?? aim.tool.id, target);
        strictEqual(
          actRow(seat, aim, on, undefined, from) === undefined,
          cause !== undefined,
          said.hiddenWrong(aim.name),
        );
        if (read !== undefined) {
          const kept = (screen: Screen) =>
            rowsIn(screen.body).some(row => row.title === original.row.title && row.detail === read);
          ok(readThrough(seat.router, kept), said.readLost(aim.name));
        }
        seat.router.send({ kind: "menu" });
        await prefer(seat, "off", false);
        ok(actRow(seat, aim, on, undefined, from), said.notOffered(aim.name));
      } finally {
        seat.router.stop();
      }
    });
  return { name: label(aim, said.hiding(kase.promise)), run };
}
export function shownChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  const refusals = program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) =>
      act.cases
        .filter(kase => "refused" in kase.then)
        .map(kase => hiddenCheck(program, shown, { tool, name, act }, kase)),
    ),
  );
  return [...refusals, ...program.registry.map(tool => foreignCheck(program, shown, tool))];
}
