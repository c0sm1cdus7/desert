// The props of Loading: content that is on its way, drawn as skeleton lines (a block of text to come) or a spinner (a
// state to come). Assistive technology hears `label` as a status; the drawing itself is hidden from it. `inset: "block"`
// pads it like a status block, so a loading state holds the place of the empty state that follows it; `id` lets a card
// point at it (aria-describedby).
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const LoadingContract = {
  props: Type.Object({
    kind: Type.Union([Type.Literal("lines"), Type.Literal("spinner")]),
    label: text,
    inset: Type.Optional(Type.Union([Type.Literal("none"), Type.Literal("block")])),
    id: Type.Optional(Type.String({ minLength: 1 })),
  }, { additionalProperties: false }),
  marks: ["data-loading"],
} as const;
