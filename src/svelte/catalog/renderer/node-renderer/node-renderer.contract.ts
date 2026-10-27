// The props of NodeRenderer (design §3.0): the resolved `node` it mounts the piece for (admitted by `resolvedNode` before
// any branch reads it) and, for a transient node only, the `continuity` of the reading context its frame keeps. `event`
// carries every callback of the mounted piece as a node event. No host, element or handler crosses this contract: the
// local file host travels by context and an overlay draws its own trigger.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeSchema } from "../../../../interaction/resolved-node-schema.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const NodeRendererContract = {
  props: Type.Object({
    node: ResolvedNodeSchema,
    continuity: Type.Optional(Type.String()),
  }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
