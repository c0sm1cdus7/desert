// The props of StackItem. `kind` is the resolved node kind it holds, which picks its placement (content or surface
// inset); its content is the `children` slot.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";

export const StackItemContract = {
  props: Type.Object({
    kind: ResolvedNodeIdSchema,
  }, { additionalProperties: false }),
} as const;
