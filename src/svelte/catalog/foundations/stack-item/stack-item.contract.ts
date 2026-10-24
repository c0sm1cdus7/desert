// The props of StackItem. `placement` is where the entry sits (the content inset of framed content, or the surface
// inset); the caller derives it from the node it holds with `stackPlacement` (infra/stack-placement.ts). `kind`, when given,
// is the resolved node kind it holds, drawn as a mark that only the surface-reading mechanism still reads (a nested
// catalog's surface and content insets, `[data-stack-kind="catalog.home"]`). The featured entry's inset of a nested catalog
// is catalog-home's own `placement` prop (P4c). F1-merge: `kind` leaves this contract with that mechanism (Batch 3).
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";

export const StackItemContract = {
  props: Type.Object({
    placement: Type.Union([Type.Literal("content"), Type.Literal("surface")]),
    kind: Type.Optional(ResolvedNodeIdSchema),
  }, { additionalProperties: false }),
  marks: ["data-stack-item", "data-stack-kind", "data-stack-placement"],
} as const;
