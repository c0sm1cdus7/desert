// The props of StackItem. `placement` is where the entry sits (the content inset of framed content, or the surface
// inset); the caller derives it from the node it holds with `stackPlacement` (infra/stack-placement.ts). `kind` is the
// resolved node kind it holds, drawn as a mark only for the nested catalog inset (`[data-stack-kind="catalog.home"]`).
// F1-merge: that inset becomes a prop of catalog-home (lane D, P4c) and `kind` leaves this contract.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";
import { StackPlacementSchema } from "../../../infra/stack-placement.ts";

export const StackItemContract = {
  props: Type.Object({
    placement: StackPlacementSchema,
    kind: ResolvedNodeIdSchema,
  }, { additionalProperties: false }),
  marks: ["data-stack-item", "data-stack-kind", "data-stack-placement"],
} as const;
