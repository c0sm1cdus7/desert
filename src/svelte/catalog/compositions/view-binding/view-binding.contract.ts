// The props of ViewBinding: one view item that shows a node (a tag, image or avatar of its own; a collection, form or
// context bound to a view input), the resolved view that holds its bindings, pending inputs and disabled outputs, and
// whether it sits in a flow (inside a stack item) or a frame. Its node's events reach `event`; a record chosen in a bound
// collection reaches it as the collection output's invocation.
import { Type } from "@sinclair/typebox";
import { AvatarNodeSchema, ImageNodeSchema, TagNodeSchema } from "../../../../interaction/extended-nodes.ts";
import { ViewBoundContentSchema } from "../../../../views/schema.ts";
import type { ResolvedView } from "../../../../views/resolved.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const ViewBindingContract = {
  props: Type.Object({
    item: Type.Union([TagNodeSchema, ImageNodeSchema, AvatarNodeSchema, ViewBoundContentSchema]),
    resolved: Type.Unsafe<ResolvedView>(),
    host: Type.Optional(Type.Union([Type.Literal("flow"), Type.Literal("frame")])),
  }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
