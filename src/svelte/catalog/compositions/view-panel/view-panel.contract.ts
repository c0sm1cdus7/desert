// The props of ViewPanel (DESIGN §3.0): the view's resolved `panel` (a confirmation or a frame), whether it is `open`,
// and `continuity`, the string identity of the view owner it was mounted for, which keeps focus and the reading position
// while that frame is replaced; a transient node the node renderer mounts without one shows its single frame, and its
// Close closes the panel. Every interaction reaches `event` as a node event.
import { Type } from "@sinclair/typebox";
import type { ResolvedPanel } from "../../../../views/resolved.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const ViewPanelContract = {
  props: Type.Object({
    panel: Type.Unsafe<ResolvedPanel>(),
    open: Type.Boolean(),
    continuity: Type.Optional(Type.String({ minLength: 1 })),
  }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
