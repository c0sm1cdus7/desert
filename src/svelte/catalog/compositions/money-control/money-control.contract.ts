// The props of MoneyControl: the money control `node` (amount in minor units, currency and the currencies it offers) and
// `onevent`, raised with money.change when the amount or the currency changes to a representable value.
import { Type } from "@sinclair/typebox";
import type { MoneyNode } from "../../../../interaction/extended-nodes.ts";

export const MoneyControlContract = {
  props: Type.Object({
    node: Type.Unsafe<MoneyNode>(),
  }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Object({
      kind: Type.Literal("money.change"),
      control: Type.String(),
      currency: Type.String(),
      minorUnits: Type.Union([Type.Null(), Type.String()]),
    }, { additionalProperties: false }),
  }, { additionalProperties: false }),
} as const;
