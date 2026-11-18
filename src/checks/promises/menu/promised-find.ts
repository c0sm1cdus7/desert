// Looking for a thing from a menu, checked for every case that leaves one: found by its name, and opened from there.
import { ok, strictEqual } from "node:assert/strict";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import { stacksOf } from "../../../surface/menus/lists.ts";
import type { Picture } from "../../../surface/session/screen.ts";
import { promiseTexts as said } from "../../../texts/promises.texts.ts";
import { surfaceTexts as surface } from "../../../texts/surface.texts.ts";
import type { Case, Composition } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { keysTo, seated, type, view, type Seat } from "../promised-keys.ts";
import { prefer } from "../off/promised-off.ts";
import { cast, given, label, perform, staged, type Aim, type Check } from "../promised-stage.ts";
type Sought = Readonly<{ tool: string; target: string; name: string }>;
/** From one menu: space, the thing's name, down to its row, enter. It lands on the thing; and going back, the
 * menu is as it was before anyone looked for anything. While looking, no row starts an act. */
function seek<X extends Program>(seat: Seat<X>, menu: Picture, { tool, target, name }: Sought): void {
  const { router, tools, state } = seat;
  type(router, ` ${name}`);
  const rows = stacksOf({ ...menu, find: name }, tools).flatMap(stack => stack.rows.filter(row => row.open));
  const at = rows.findIndex(row => row.opens === target && row.open?.kind === "view" && row.open.tool === tool);
  /** Who is no longer in the house finds nothing (6a). */
  if (!state().house.grants.has(state().by)) {
    strictEqual(at, -1, said.absentReader);
    return;
  }
  ok(at >= 0, said.notFound(name));
  ok(!rows.some(row => row.starts), said.actsWhileFinding);
  for (let step = 0; step < at; step++) router.send({ kind: "down" });
  router.send({ kind: "confirm" });
  strictEqual(router.screen(view).title, name);
  router.send({ kind: "cancel" });
  const back = router.screen(view).body;
  ok(back.kind === "list" && back.stacks[0]?.title !== surface.find, said.stillFinding);
}
/** The thing an act leaves is found by the name its tool gives it: from the tool's own menu, and from the Menu. */
function findCheck<X extends Program>(program: Composition<X>, shown: Shown<X>, aim: Aim<X>, kase: Case<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name });
      const written = done.effects.flatMap(effect =>
        effect.layer === "house" && effect.kind === "tool-entry" ? [effect.data.target] : [],
      );
      const target = written.find(thing => aim.tool.targets(house().tools.state()).includes(thing));
      /** An act that leaves no thing of its tool leaves nothing to look for. */
      if (target === undefined) return;
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      const name = seat.tools.find(tool => tool.id === aim.tool.id)?.titleOf?.(target) ?? target;
      const sought = { tool: aim.tool.id, target, name };
      try {
        seek(seat, { kind: "menu", at: 0 }, sought);
        type(seat.router, keysTo(shown, aim.tool.id));
        const entry = seat.tools.find(tool => tool.id === aim.tool.id)?.entryTarget;
        seek(seat, { kind: "view", tool: aim.tool.id, at: 0, ...(entry ? { target: entry } : {}) }, sought);
        const outsider = seated(house(), cast.outsider, shown);
        try {
          await prefer(outsider, "foreign", true);
          seek(outsider, { kind: "menu", at: 0 }, sought);
        } finally {
          outsider.router.stop();
        }
      } finally {
        seat.router.stop();
      }
    });
  return { name: label(aim, said.finding(kase.promise)), run };
}
export function findChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  return program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) =>
      act.cases
        .filter(kase => !("refused" in kase.then))
        .map(kase => findCheck(program, shown, { tool, name, act }, kase)),
    ),
  );
}
