// The props of ViewRegion. `kind: "view"` frames a view (its layout, and the place content inset unless the view hosts a
// catalog); `kind: "item"` frames one item; `kind: "bare"` renders the content with no frame (a panel frames it itself).
// The id is the view's or the item's id.
import { Type } from "@sinclair/typebox";

export const ViewRegionContract = {
  props: Type.Object({
    kind: Type.Union([Type.Literal("view"), Type.Literal("item"), Type.Literal("bare")]),
    id: Type.String(),
    layout: Type.Optional(Type.Union([Type.Literal("overview"), Type.Literal("gallery"), Type.Undefined()])),
    inset: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  marks: ["data-view-content", "data-view-item", "data-content-layout"],
} as const;
