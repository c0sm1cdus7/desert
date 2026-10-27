// The props of Text: one paragraph in a type role. `kind` is the role (body, support, caption); `weight` raises it to
// medium; `tone` mutes it or marks it destructive; `align` overrides the inherited alignment; `inset: "row"` aligns it
// with the content of grouped rows; `live: "polite"` announces it as a status (what Feedback and MessageBody did) and
// `live: "assertive"` as an alert (a control's rejection of what was just written, as its field error did); `id` lets
// a dialog or a field point at it (aria-describedby); `wrap: "anywhere"` breaks a long word (a name) anywhere rather
// than overflow, and `wrap: "lines"` also keeps the line breaks of reading copy (a description of paragraphs).
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const TextContract = {
  props: Type.Object({
    text: text,
    kind: Type.Union([Type.Literal("body"), Type.Literal("support"), Type.Literal("caption")]),
    weight: Type.Optional(Type.Union([Type.Literal("regular"), Type.Literal("medium")])),
    tone: Type.Optional(Type.Union([Type.Literal("default"), Type.Literal("muted"), Type.Literal("destructive")])),
    align: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("center"), Type.Literal("end")])),
    inset: Type.Optional(Type.Union([Type.Literal("none"), Type.Literal("row")])),
    live: Type.Optional(Type.Union([Type.Literal("off"), Type.Literal("polite"), Type.Literal("assertive")])),
    id: Type.Optional(Type.String({ minLength: 1 })),
    wrap: Type.Optional(Type.Union([Type.Literal("anywhere"), Type.Literal("lines")])),
  }, { additionalProperties: false }),
} as const;
