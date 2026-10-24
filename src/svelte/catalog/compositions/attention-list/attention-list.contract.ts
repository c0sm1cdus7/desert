// The props of AttentionList: the identity's attention snapshot and how to resume one of its items.
import { Type } from "@sinclair/typebox";
import type { AttentionSnapshot } from "../../../../web/client/attention-feed.ts";

export const AttentionListContract = {
  props: Type.Object({
    state: Type.Unsafe<AttentionSnapshot>(),
    resume: Type.Function([Type.String()], Type.Void()),
  }, { additionalProperties: false }),
} as const;
