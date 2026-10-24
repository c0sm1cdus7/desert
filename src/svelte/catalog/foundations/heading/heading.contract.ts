// The props of Heading. `kind` is the meaning; `focusTarget` only for a page, `id` only for a rail title, `required` only
// for a group label (the entry validates the exact combination per kind at runtime with heading-content.ts).
import { Type } from "@sinclair/typebox";

export const HeadingContract = {
  props: Type.Object({
    kind: Type.Union([Type.Literal("page"), Type.Literal("document-title"), Type.Literal("rail-title"), Type.Literal("group-label")]),
    text: Type.String(),
    focusTarget: Type.Optional(Type.Boolean()),
    id: Type.Optional(Type.String()),
    required: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
