// What a person sees of what they cannot do, and what they may prefer not to see: checked for every tool and act.
import { ok, strictEqual } from "node:assert/strict";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Case, Composition, ProgramTool } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import type { Choice } from "../surface/screen.ts";
import { actRow, goTo, menuRows, seated, type, view } from "./promised-keys.ts";
import { prefer } from "./promised-preferences.ts";
export { prefer } from "./promised-preferences.ts";
import { firstUnavailable } from "./promised-availability.ts";
import { cast, given, label, staged, type Aim, type Check } from "./promised-stage.ts";

/** A tool nobody gave you is on your Menu all the same, or listed in the tool it lives in: off, saying why, and its
 * key opens nothing. It leaves only for who prefers not to see what is not theirs, and comes back when they prefer
 * to see it again. */
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
/** What an off row reads of its thing, before it says why it is off: nothing when it only says why. */
const readBy = ({ detail }: Choice, cause?: string): string | undefined =>
  cause !== undefined && detail?.endsWith(` · ${cause}`) ? detail.slice(0, -cause.length - 3) : undefined;
/** Who prefers not to see what cannot be done stops seeing an act exactly while its tool says it cannot be done:
 * nothing else leaves the list, and the act comes back when they prefer to see it again. */
function hiddenCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      const on = kase.on ?? aim.tool.id;
      try {
        await prefer(seat, "off", true);
        goTo(seat, aim.tool.id, on);
        const cannot =
          (aim.act.offered?.(seat.state(), on, seat.now()) ?? firstUnavailable(seat, aim, on)) !== undefined;
        strictEqual(actRow(seat, aim, on) === undefined, cannot, said.hiddenWrong(aim.name));
        const hidden = JSON.stringify(seat.router.screen(view).body);
        seat.router.send({ kind: "menu" });
        await prefer(seat, "off", false);
        const shownAgain = actRow(seat, aim, on);
        ok(shownAgain, said.notOffered(aim.name));
        /** What the row read of the thing was read all along: hiding takes the way to change it, never the datum. */
        const read = readBy(shownAgain.row, aim.act.offered?.(seat.state(), on, seat.now()));
        ok(read === undefined || hidden.includes(JSON.stringify(read).slice(1, -1)), said.readLost(aim.name));
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
