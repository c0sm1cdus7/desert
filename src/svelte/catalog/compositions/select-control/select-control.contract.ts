// The props of SelectControl: the resolved select node (label, value, options, required, disabled). It emits `event`
// with a select change: the chosen value, or null when the selection is cleared.
import { Type } from "@sinclair/typebox";
import { SelectNodeSchema } from "../../../../interaction/control-nodes.ts";

export const SelectControlContract = {
  props: Type.Object({ node: SelectNodeSchema }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Object({
      kind: Type.Literal("select.change"),
      control: Type.String(),
      value: Type.Union([Type.String(), Type.Null()]),
    }, { additionalProperties: false }),
  }, { additionalProperties: false }),
} as const;
