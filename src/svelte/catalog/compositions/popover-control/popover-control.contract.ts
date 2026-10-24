// The props of PopoverControl: the popover control node it draws. `event` carries the popover's open change.
import { Type } from "@sinclair/typebox";
import type { PopoverNode } from "../../../../interaction/control-nodes.ts";

export const PopoverControlContract = {
  props: Type.Object({ node: Type.Unsafe<PopoverNode>() }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Object({ kind: Type.Literal("popover.open"), control: Type.String(), open: Type.Boolean() }, { additionalProperties: false }),
  }, { additionalProperties: false }),
} as const;
