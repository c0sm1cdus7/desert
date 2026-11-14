// Derived checks keep the core's distinct authorization contract: a kit cannot grant or revoke administration.
import { deepStrictEqual, ok, strictEqual, throws } from "node:assert/strict";
import { promiseTexts as said } from "../../texts/promises.texts.ts";
import type { Choice } from "../../surface/screen.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { cast, given, label, perform, staged, wroteSince } from "../promised-stage.ts";
import type { House, Doing, Aim, Check } from "../promised-stage.ts";
import type { Case, Composition } from "../../tools/promises.ts";
import { effect } from "../../journal/events.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
export function checkKitChange(tool: string, change: () => unknown): void {
  if (tool === "identities") throws(change, /Identidades/);
  else change();
}
export function checkForeignVisibility(tool: string, row: Choice | undefined): void {
  if (tool === "identities") ok(row?.open, said.notOnMenu(tool));
  else strictEqual(row, undefined, said.stillShown(tool));
}
/** Core setup acts are performed by the administrator too; explicitly close their targets before testing unseen. */
export function closeCoreSetup<X extends Program>(house: House<X>, tool: string, doing: Partial<Doing>): void {
  if (tool !== "identities" || doing.attends !== false) return;
  const by = doing.by ?? "ana";
  for (const target of house.tools.state().attendance.get(by) ?? [])
    house.tools.act({ act: "unattend", input: { target } }, 0, by);
}

export function withoutActionCheck<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check {
  return {
    name: label(aim, said.outsideKit),
    run: () =>
      staged(program, async ({ house }) => {
        await given(house(), aim.tool.id, kase.given, kase.at);
        checkKitChange(aim.tool.id, () =>
          house().bus.emit(effect("kit-set", { holder: cast.member, tool: aim.tool.id, acts: [] }, cast.admin)),
        );
        const before = house().tools.state().through;
        const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name, by: cast.member });
        deepStrictEqual([done.status, done.reason], ["rejected", toolTexts.kitRefusal(aim.tool.id)]);
        deepStrictEqual(wroteSince(house(), before), []);
      }),
  };
}
