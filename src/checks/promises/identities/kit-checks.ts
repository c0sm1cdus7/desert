// A mind is an action-kit subject, never an identity to remove, readmit or hand administration to.
import { deepStrictEqual, strictEqual } from "node:assert/strict";
import type { Composition, ProgramTool } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Found } from "../promised-keys.ts";
import { perform, staged, type Aim } from "../promised-stage.ts";
import { identityTexts as words } from "../../../texts/identities.texts.ts";
/** A mind holds its own tool and the talk tools (signed 20/11); any other tool's kit is foreign to it. */
const holdable = (act: string, tool: string) =>
  act === `kit:${tool}` || act.startsWith(`kit:${tool}:`) || act.startsWith(`kit:${tool}/`);
function foreignMindTarget<X extends Program>(
  tool: ProgramTool<X>,
  act: string,
  target: string,
  talk: readonly string[],
) {
  if (tool.id !== "identities") return false;
  if (!target.startsWith("identities/mind:")) {
    const menu = tool.acts[act]?.under;
    return menu?.startsWith("kit:") === true && tool.acts[menu] === undefined;
  }
  const own = target.slice("identities/mind:".length);
  return ![own, ...talk].some(each => holdable(act, each));
}
/** Absence is mandatory here, not a bypass: another tool's actions and identity lifecycle must never be offered. */
export function absentMindAction<X extends Program>(
  tool: ProgramTool<X>,
  act: string,
  target: string,
  found: Found | undefined,
  talk: readonly string[],
): boolean {
  if (!foreignMindTarget(tool, act, target, talk)) return false;
  strictEqual(found, undefined, words.unexpectedAction(act, target));
  return true;
}
/** Derive every forbidden mind destination from the catalog, and try execution as the administrator too. */
export async function mindTargetCauses<X extends Program>(program: Composition<X>, aim: Aim<X>): Promise<string[]> {
  if (aim.tool.id !== "identities" || aim.act.on !== "thing") return [];
  const causes: string[] = [];
  await staged(program, async ({ house }) => {
    const targets = aim.tool.targets(house().tools.state());
    const talk = house().tools.state().house.talk ?? [];
    for (const on of targets.filter(target => foreignMindTarget(aim.tool, aim.name, target, talk))) {
      const before = house().tools.state().house;
      const input = aim.name.startsWith("kit:") ? { value: "yes" } : {};
      const done = await perform(house(), aim.tool.id, { act: aim.name, on, input });
      const cause = aim.name === "scene" ? words.ownScene : words.ownActions;
      deepStrictEqual([done.status, done.reason], ["rejected", cause]);
      deepStrictEqual(house().tools.state().house, before);
      causes.push(cause);
    }
  });
  return causes;
}
