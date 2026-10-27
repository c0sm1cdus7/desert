// The props of ViewItem: one view item, the resolved view it belongs to (bindings, pending inputs, disabled outputs),
// and whether it sits in a flow or a frame (`host`). It emits `event` with the node event of what it mounts.
import { Type } from "@sinclair/typebox";
import { ViewItemSchema } from "../../../../views/schema.ts";
import type { ResolvedView } from "../../../../views/resolved.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const ViewItemContract = {
  props: Type.Object({
    item: ViewItemSchema,
    resolved: Type.Unsafe<ResolvedView>(),
    host: Type.Optional(Type.Union([Type.Literal("flow"), Type.Literal("frame")])),
  }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
