import { inspect } from "node:util";
import { TypeGuard } from "@sinclair/typebox";
import { fieldValidity } from "../../catalogs/fields.ts";
import { actionOff } from "../../surface/availability/action-off.ts";
import { identityView } from "../../house/house.ts";
import { programCall } from "../../tools/boundaries/program-call.ts";
import type { Composition } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { cast, given, staged, type Aim } from "../promised-stage.ts";

export async function openingChecks<X extends Program>(program: Composition<X>, aim: Aim<X>): Promise<void> {
  const also = aim.act.also;
  const opens = also?.opens;
  if (!also || !opens) return;
  for (const kase of aim.act.cases) {
    await staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const state = identityView(house().tools.state(), kase.by ?? cast.admin);
      const origin = program.registry.find(tool => tool.id === also.tool);
      for (const target of origin?.targets(state) ?? []) {
        const fixed = programCall(also.with.bind(also), state, target, house().now());
        if (
          fixed === undefined ||
          actionOff(aim.act, state, aim.tool.id, aim.tool.id, house().now(), () => null, target) !== undefined
        )
          continue;
        const values = programCall(opens.bind(also), state, target);
        const properties: unknown = aim.act.input.properties;
        for (const [key, value] of Object.entries(values)) {
          const field: unknown =
            properties && typeof properties === "object" ? Reflect.get(properties, key) : undefined;
          if (
            value !== undefined &&
            TypeGuard.IsSchema(field) &&
            (({ invalid, wrong }) => invalid || wrong !== undefined)(fieldValidity(field, value, house().now()))
          )
            throw new Error(`Invalid initial at $.${key}: ${inspect(value)}`);
        }
      }
    });
  }
}
