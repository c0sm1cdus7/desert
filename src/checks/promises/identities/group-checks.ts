// Resolves each action's declared destinations and checks forbidden group destinations in surface and execution.
import { deepStrictEqual, strictEqual } from "node:assert/strict";
import type { Composition } from "../../../tools/promises-contract.ts";
import type { Program, State } from "../../../tools/tool-contract.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import type { ExecutionDestination } from "../../../fields/device-protocol.ts";
import { deviceTexts } from "../../../texts/devices.texts.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import { staged, perform, given, type Aim, type House } from "../promised-stage.ts";
import { seated } from "../promised-keys.ts";
import { entries } from "../walk/fixed-entries.ts";

/** Use the declaration, never availability: a refusal still needs a row on every applicable destination. */
export function actionTargets<X extends Program>(aim: Aim<X>, state: State<X>): readonly string[] {
  if (aim.act.folder === undefined) return aim.act.on === "tool" ? [aim.tool.id] : aim.tool.targets(state);
  const group = aim.tool.groups?.find(group => group.tool.id === aim.act.folder)?.tool;
  const original = group?.acts[aim.name];
  if (!group || !original) throw new Error(`Missing group action: ${aim.tool.id}/${aim.name}`);
  return original.on === "tool" ? [group.id] : group.targets(state);
}

export async function groupTargetCauses<X extends Program>(
  program: Composition<X>,
  shown: Shown<X>,
  aim: Aim<X>,
): Promise<string[]> {
  if (aim.act.folder === undefined) return [];
  const causes: string[] = [];
  await staged(program, async ({ house }) => {
    const destination = await groupDevice(house(), aim);
    const seat = seated(house(), house().tools.state().house.admin, shown);
    try {
      const rows = entries(seat.tools).filter(row => row.starts?.tool === aim.tool.id && row.starts.act === aim.name);
      const state = house().tools.state();
      const own = actionTargets(aim, state);
      const foreign = [aim.tool.id, ...aim.tool.targets(state)].filter(target => !own.includes(target));
      for (const on of foreign) {
        strictEqual(
          rows.some(row => (row.starts?.target ?? aim.tool.id) === on),
          false,
        );
        await checkForeignTarget(house(), aim, on, destination);
        causes.push(toolTexts.unknown);
      }
    } finally {
      seat.router.stop();
    }
  });
  return causes;
}

/** A compatible in-memory endpoint makes an accidental foreign dispatch observable as acceptance. */
async function groupDevice<X extends Program>(house: House<X>, aim: Aim<X>) {
  const execution = aim.act.execution;
  if (execution?.at !== "device") return undefined;
  const destination = { kind: "device" as const, device: "group-target-check" };
  await given(house, aim.tool.id, [
    {
      device: {
        id: destination.device,
        owner: house.tools.state().house.admin,
        tool: execution.tool,
        version: execution.version,
        actions: [aim.name],
        result: "group-target-check",
      },
    },
  ]);
  return destination;
}
async function checkForeignTarget<X extends Program>(
  house: House<X>,
  aim: Aim<X>,
  on: string,
  destination: ExecutionDestination | undefined,
) {
  const before = house.tools.state();
  const doing = { act: aim.name, on, input: aim.act.cases[0]?.input };
  if (aim.act.execution?.at === "device") {
    const missing = await perform(house, aim.tool.id, doing);
    deepStrictEqual([missing.status, missing.reason, missing.defect], ["rejected", deviceTexts.destination, undefined]);
    deepStrictEqual(house.tools.state().tools, before.tools);
    deepStrictEqual(house.tools.state().house, before.house);
  }
  const done = await perform(house, aim.tool.id, { ...doing, ...(destination ? { destination } : {}) });
  deepStrictEqual([done.status, done.reason, done.defect], ["rejected", toolTexts.unknown, undefined]);
  deepStrictEqual(house.tools.state().tools, before.tools);
  deepStrictEqual(house.tools.state().house, before.house);
}
