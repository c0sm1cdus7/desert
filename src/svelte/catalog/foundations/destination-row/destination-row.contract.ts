// The props of DestinationRow. `destination` names what the row opens, `label` is its title and `icon` its face;
// `open` is called when an `available` row is pressed; an unavailable row shows `reason` instead.
import { Type } from "@sinclair/typebox";
import { ActionIconSchema } from "../../../../interaction/action-icon.ts";

export const DestinationRowContract = {
  props: Type.Object({
    destination: Type.String(),
    label: Type.String(),
    available: Type.Boolean(),
    open: Type.Function([], Type.Void()),
    icon: Type.Optional(Type.Union([ActionIconSchema, Type.Undefined()])),
    reason: Type.Optional(Type.Union([Type.String(), Type.Undefined()])),
  }, { additionalProperties: false }),
} as const;
