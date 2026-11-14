// What a person sees of what they cannot do, and what they may prefer not to see: checked for every tool and act.
import { ok, strictEqual } from "node:assert/strict";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { stacksOf } from "../surface/lists.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../texts/surface.texts.ts";
import type { Case, Composition, ProgramTool } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import type { Screen } from "../surface/contract.ts";
import type { Choice } from "../surface/screen.ts";
import { readThrough, rowsIn } from "./read-screen.ts";
import { actRow, goTo, keysTo, menuRows, seated, type, view, type Seat } from "./promised-keys.ts";
import { prefer } from "./promised-preferences.ts";
export { prefer } from "./promised-preferences.ts";
import { actionUnavailable, caseOrigin } from "./availability/case-availability.ts";
import { cast, given, label, staged, type Aim, type Check } from "./promised-stage.ts";
/** The unheld tool remains readable and its actions remain in place with the kit reason. */
function foreignActions<X extends Program>(seat: Seat<X>, tool: ProgramTool<X>): void {
  for (const [name, act] of Object.entries(tool.acts)) {
    const targets = act.on === "tool" ? [tool.id] : tool.targets(seat.state());
    for (const target of targets) {
      const found = actRow(seat, { tool, name, act }, target);
      ok(found, said.notOffered(name));
      ok(found.row.off);
      ok(found.row.detail?.endsWith(toolTexts.outsideKit));
      strictEqual(found.row.open, undefined);
    }
  }
}
/** References on the things the case prepared must lead somewhere even without their tools. */
function foreignReferences<X extends Program>(seat: Seat<X>, program: Composition<X>): void {
  for (const source of program.registry) {
    for (const target of source.targets(seat.state())) {
      const references = stacksOf({ kind: "view", tool: source.id, target, at: 0 }, seat.tools)
        .flatMap(stack => stack.rows)
        .filter(item => item.opens !== undefined && !item.starts);
      for (const reference of references) ok(reference.open);
    }
  }
}
/** A tool outside the kit opens from its usual place, and the foreign preference hides it there. */
function foreignCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, tool: ProgramTool<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      const example = Object.values(tool.acts).flatMap(act => act.cases)[0];
      if (example) await given(house(), tool.id, example.given, example.at);
      const seat = seated(house(), cast.outsider, shown);
      const key = shown.words[tool.id]?.key ?? "";
      const row = () => menuRows(seat.tools, shown.words[tool.id]?.inside).find(listed => listed.key === key);
      try {
        ok(row()?.open, said.notOnMenu(tool.id));
        type(seat.router, keysTo(shown, tool.id));
        const opened = seat.router.screen(view);
        ok(opened.title !== surface.menu, said.notOnMenu(tool.id));
        foreignActions(seat, tool);
        foreignReferences(seat, program);
        seat.router.send({ kind: "menu" });
        await prefer(seat, "foreign", true);
        strictEqual(row(), undefined, said.stillShown(tool.id));
        await prefer(seat, "foreign", false);
        ok(row()?.open, said.notOnMenu(tool.id));
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
      const from = caseOrigin(aim, kase);
      try {
        const original = actRow(seat, aim, on, undefined, from);
        ok(original, said.notOffered(aim.name));
        const cause = actionUnavailable(seat, aim, on, [], from?.target);
        /** What the row read of the thing was read all along: hiding takes the way to change it, never the datum. */
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
