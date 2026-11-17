// Derived checks keep the core's distinct authorization contract: a kit cannot grant or revoke administration.
import { deepStrictEqual, ok, strictEqual, throws } from "node:assert/strict";
import { promiseTexts as said } from "../../../texts/promises.texts.ts";
import type { Choice } from "../../../surface/session/screen.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import {
  cast,
  given,
  label,
  perform,
  staged,
  wroteSince,
  type House,
  type Doing,
  type Aim,
  type Check,
} from "../promised-stage.ts";

import type { Case, Composition } from "../../../tools/promises.ts";
import { effect } from "../../../house/facts.ts";
import { identityTexts } from "../../../texts/identities.texts.ts";
import { assistantText } from "../../../texts/assistant.texts.ts";
import type { State } from "../../../tools/tool-contract.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
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

/** Personal actions retain their own availability rules even though Identidades has no assignable kit. */
export function checkOwnRow<X extends Program>(
  tool: string,
  act: string,
  state: State<X>,
  target: string,
  row?: Choice,
): boolean {
  if (tool !== "identities" || (act !== "scene" && act !== "delegate-assistant")) return false;
  const owner = target.slice("identities/".length);
  const reason = () => {
    if (act === "scene") return owner === state.by ? undefined : identityTexts.ownScene;
    if (!state.house.grants.has(owner)) return assistantText("absent", "es");
    if (owner !== state.by) return assistantText("owner", "es");
    return state.house.assistants.get(owner)?.enabled ? undefined : assistantText("disabled", "es");
  };
  const cause = reason();
  ok(row);
  if (cause === undefined) {
    ok(row.open);
    ok(!row.off);
  } else {
    ok(row.off);
    ok(row.detail?.endsWith(cause));
    strictEqual(row.open, undefined);
  }
  return true;
}
export const isCoreScene = <X extends Program>(aim: Aim<X>) => aim.tool.id === "identities" && aim.name === "scene";
export const isCorePersonal = <X extends Program>(aim: Aim<X>) =>
  isCoreScene(aim) || (aim.tool.id === "identities" && aim.name === "delegate-assistant");
export function withoutActionCheck<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check {
  return {
    name: label(aim, isCoreScene(aim) ? identityTexts.promises.sceneWithoutKit : said.outsideKit),
    run: () =>
      staged(program, async ({ house }) => {
        await given(house(), aim.tool.id, kase.given, kase.at);
        checkKitChange(aim.tool.id, () =>
          house().bus.emit(effect("kit-set", { holder: cast.member, tool: aim.tool.id, acts: [] }, cast.admin)),
        );
        if (isCoreScene(aim)) {
          const done = await perform(house(), aim.tool.id, {
            ...kase,
            act: aim.name,
            by: cast.member,
            on: `identities/${cast.member}`,
          });
          strictEqual(done.status, "accepted");
          deepStrictEqual(house().tools.state().house.scenes.get(cast.member)?.data, kase.input);
          return;
        }
        if (isCorePersonal(aim)) {
          const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name });
          strictEqual(done.status, "accepted");
          deepStrictEqual(
            {
              kit: house()
                .tools.state()
                .house.assistants.get(kase.by ?? cast.admin)?.kit,
            },
            kase.input,
          );
          return;
        }
        const before = house().tools.state().through;
        const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name, by: cast.member });
        deepStrictEqual([done.status, done.reason], ["rejected", toolTexts.kitRefusal(aim.tool.id)]);
        deepStrictEqual(wroteSince(house(), before), []);
      }),
  };
}
