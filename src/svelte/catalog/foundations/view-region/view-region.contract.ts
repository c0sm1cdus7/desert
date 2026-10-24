// The props of ViewRegion. `kind: "view"` frames a view (its layout, and the place content inset unless the view hosts a
// catalog); `"item"` frames one item (a named section when it has a `label`); `"document"` is a place's content article,
// named by its `label`; `"retained"` keeps a place mounted while hidden and provides whether it is `active` (the active
// surface); `"bare"` renders the content unframed (a panel frames it itself). `visible` (default true) hides the region
// without unmounting it. The id is the view's or the item's id; every framed region registers its reveal under it.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const ViewRegionContract = {
  props: Type.Object({
    kind: Type.Union([Type.Literal("view"), Type.Literal("item"), Type.Literal("bare"), Type.Literal("document"), Type.Literal("retained")]),
    id: Type.String(),
    layout: Type.Optional(Type.Union([Type.Literal("overview"), Type.Literal("gallery"), Type.Undefined()])),
    inset: Type.Optional(Type.Boolean()),
    label: Type.Optional(text),
    visible: Type.Optional(Type.Boolean()),
    active: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  marks: ["data-view-content", "data-view-item", "data-content-layout", "data-place-content", "data-retained-place"],
} as const;
