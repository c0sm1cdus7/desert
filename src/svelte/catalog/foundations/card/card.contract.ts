// The props of Card: one pressable card that opens what it shows. `presentation` is its anatomy: a catalog item (or the
// featured entry, drawn the same) with its title over the artwork, a media tile, a collection cover with its title and
// count, or a summary whose content is the `children` slot. `label` is its accessible name ("Open …"); `artwork` is an
// image (`alt` is its text alternative, empty when decorative) or the placeholder of missing artwork, fitted by `fit`;
// `prefetch` is the larger image to warm when the person points at or focuses the card. `attention` shows the attention
// dot, `current` marks the shown object, `disabled` keeps it visible but closed; a summary names its readings with
// `describedBy` (element ids) and is `busy` while it loads. `focusKey` registers the card in the nearest focus scope,
// so a caller (a viewer it opened) can return focus to it by key.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { AssetReferenceSchema } from "../../../../assets/types.ts";

export const CardContract = {
  props: Type.Object({
    presentation: Type.Union([Type.Literal("featured"), Type.Literal("item"), Type.Literal("tile"), Type.Literal("collection"),
      Type.Literal("summary")]),
    label: text,
    artwork: Type.Optional(Type.Union([Type.String(), AssetReferenceSchema,
      Type.Object({ kind: Type.Literal("placeholder"), media: Type.Union([Type.Literal("video"), Type.Literal("audio"), Type.Literal("unavailable")]) },
        { additionalProperties: false })])),
    alt: Type.Optional(Type.String()),
    fit: Type.Optional(Type.Union([Type.Literal("fill"), Type.Literal("fit")])),
    prefetch: Type.Optional(Type.String()),
    title: Type.Optional(text),
    subtitle: Type.Optional(text),
    attention: Type.Boolean(),
    current: Type.Boolean(),
    disabled: Type.Boolean(),
    describedBy: Type.Optional(Type.String()),
    busy: Type.Optional(Type.Boolean()),
    focusKey: Type.Optional(Type.String()),
  }, { additionalProperties: false }),
  events: Type.Object({ open: Type.Void() }, { additionalProperties: false }),
  marks: ["data-card"],
} as const;
