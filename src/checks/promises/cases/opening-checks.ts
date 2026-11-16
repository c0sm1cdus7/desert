import { inspect } from "node:util";
import { TypeGuard } from "@sinclair/typebox";
import { fieldValidity } from "../../../fields/fields.ts";
import { actionOff } from "../../../surface/bridge/acts/action-off.ts";
import { houseTools, questionsFor } from "../../../surface/bridge/assembly/house-tools.ts";
import { walked } from "../../../surface/bridge/acts/asked-act.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import { localPorts } from "../../../runtime/house-runtime.ts";
import { programCall } from "../../../fields/program-call.ts";
import type { Composition } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { cast, given, staged, type Aim } from "../promised-stage.ts";
export async function openingChecks<X extends Program>(
  program: Composition<X>,
  aim: Aim<X>,
  shown: Shown<X>,
): Promise<void> {
  const also = aim.act.also;
  const opens = also?.opens;
  if (!also || !opens) return;
  for (const kase of aim.act.cases) {
    await staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const ports = localPorts(house(), kase.by ?? cast.admin, { recentLines: 100 }, house().now);
      const state = ports.state();
      const tools = houseTools(ports, shown);
      const { ask, walk } = walked(
        { ...ports, act: value => ports.act(value, state.through) },
        { tool: aim.tool.id, name: aim.name, act: aim.act },
        questionsFor(ports, shown, () => tools),
      );
      const origin = program.registry.find(tool => tool.id === also.tool);
      for (const target of origin?.targets(state) ?? []) {
        const supplied = programCall(also.with.bind(also), state, target, house().now());
        if (supplied === undefined) continue;
        const fixed = ask.leading(supplied);
        const first = () => walk.next(fixed);
        if (actionOff(aim.act, state, aim.tool.id, aim.tool.id, house().now(), first, target, aim.name) !== undefined)
          continue;
        checkValues(aim, programCall(opens.bind(also), state, target), house().now());
      }
    });
  }
}

/** Every present suggestion is held to the same field validation as execution. */
function checkValues<X extends Program>(aim: Aim<X>, values: Readonly<Record<string, unknown>>, at: number): void {
  const properties: unknown = aim.act.input.properties;
  for (const [key, value] of Object.entries(values)) {
    const field: unknown = properties && typeof properties === "object" ? Reflect.get(properties, key) : undefined;
    if (
      value !== undefined &&
      TypeGuard.IsSchema(field) &&
      (({ invalid, wrong }) => invalid || wrong !== undefined)(fieldValidity(field, value, at))
    )
      throw new Error(`Invalid initial at $.${key}: ${inspect(value)}`);
  }
}
