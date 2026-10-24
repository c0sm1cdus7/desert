// The props of UtilityActions: the utility actions of a frame (as the domain's UtilityActionSchema defines each one) and
// `invoke`, called with the surface intent of the action the person pressed.
import { Type } from "@sinclair/typebox";
import { UtilityActionSchema } from "../../../../interaction/toolbar.ts";
import type { SurfaceIntent } from "../../../../interaction/intent.ts";

export const UtilityActionsContract = {
  props: Type.Object({
    actions: Type.Array(UtilityActionSchema),
    invoke: Type.Function([Type.Unsafe<SurfaceIntent>()], Type.Void()),
  }, { additionalProperties: false }),
} as const;
