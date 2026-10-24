// The props of ViewAttention: the identity's attention snapshot. `event` fires with `attention.resume` when a person
// resumes one of its items.
import { Type } from "@sinclair/typebox";
import type { AttentionSnapshot } from "../../../../web/client/attention-feed.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const ViewAttentionContract = {
  props: Type.Object({
    state: Type.Unsafe<AttentionSnapshot>(),
  }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
