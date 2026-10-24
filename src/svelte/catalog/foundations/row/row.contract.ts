// The props of Row: one row of a list that opens what it names, or states it. `label` is its title, `description` and
// `metadata` its supporting lines, `leading` the mark before it (a face, the attention dot, an image or the placeholder
// of missing artwork) and `trailing` the chevron after it. An `open` row is a button; a `static` row only reads. An
// unavailable row stays visible, disabled, with its `reason`; `current` marks the row of the shown object. `focusKey`
// registers the row in the nearest focus scope, so a caller can return focus to it by key. `attention` draws the attention dot
// over an open row's corner (a media list item marks the item that requires attention, beside its artwork).
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { FaceSchema } from "../../../../interaction/face.ts";
import { AssetReferenceSchema } from "../../../../assets/types.ts";

export const RowContract = {
  props: Type.Object({
    label: text,
    description: Type.Optional(text),
    metadata: Type.Optional(Type.Array(text)),
    leading: Type.Optional(Type.Union([
      Type.Object({ kind: Type.Literal("face"), face: FaceSchema }, { additionalProperties: false }),
      Type.Object({ kind: Type.Literal("attention"), required: Type.Boolean() }, { additionalProperties: false }),
      Type.Object({ kind: Type.Literal("image"), source: Type.Union([Type.String(), AssetReferenceSchema]), alt: Type.String(),
        fit: Type.Union([Type.Literal("fill"), Type.Literal("fit")]) }, { additionalProperties: false }),
      Type.Object({ kind: Type.Literal("artwork"), media: Type.Union([Type.Literal("video"), Type.Literal("audio"), Type.Literal("unavailable")]) },
        { additionalProperties: false }),
    ])),
    trailing: Type.Union([Type.Literal("chevron"), Type.Literal("none")]),
    interaction: Type.Union([Type.Literal("open"), Type.Literal("static")]),
    available: Type.Boolean(),
    reason: Type.Optional(text),
    current: Type.Boolean(),
    focusKey: Type.Optional(Type.String()),
    attention: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  events: Type.Object({ open: Type.Void() }, { additionalProperties: false }),
  marks: ["data-row", "data-row-leading"],
} as const;
