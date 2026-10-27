// The props of DateControl: the resolved date node (label, value, bounds, required, disabled, as the domain's
// DateNodeSchema defines it). It emits `event` with a date change: the chosen ISO day, or null when cleared.
import { Type } from "@sinclair/typebox";
import { DateNodeSchema } from "../../../../interaction/extended-nodes.ts";

export const DateControlContract = {
  props: Type.Object({ node: DateNodeSchema }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Object({
      kind: Type.Literal("date.change"),
      control: Type.String(),
      value: Type.Union([Type.String(), Type.Null()]),
    }, { additionalProperties: false }),
  }, { additionalProperties: false }),
} as const;
