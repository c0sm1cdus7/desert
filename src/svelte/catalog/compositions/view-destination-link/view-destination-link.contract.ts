// The props of ViewDestinationLink: one view output shown as a destination row. Opening it reports a
// `surface.invoke` of that output through `onevent`.
import { Type } from "@sinclair/typebox";
import { ActionIconSchema } from "../../../../interaction/action-icon.ts";
import type { NodeEvent } from "../../../../interaction/node-events.ts";

export const ViewDestinationLinkContract = {
  props: Type.Object({
    view: Type.String(),
    output: Type.String(),
    label: Type.String(),
    available: Type.Boolean(),
    icon: Type.Optional(Type.Union([ActionIconSchema, Type.Undefined()])),
    reason: Type.Optional(Type.Union([Type.String(), Type.Undefined()])),
  }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Unsafe<NodeEvent>(),
  }, { additionalProperties: false }),
} as const;
