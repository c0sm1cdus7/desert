// The props of OptionsControl: the resolved options node (label, options, selection and its bounds, as the domain's
// OptionsNodeSchema defines it). It emits `event` with an options change: the complete new selection.
import { Type } from "@sinclair/typebox";
import { OptionsNodeSchema } from "../../../../interaction/extended-nodes.ts";

export const OptionsControlContract = {
  props: Type.Object({ node: OptionsNodeSchema }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Object({
      kind: Type.Literal("options.change"),
      control: Type.String(),
      selected: Type.Array(Type.String()),
    }, { additionalProperties: false }),
  }, { additionalProperties: false }),
} as const;
