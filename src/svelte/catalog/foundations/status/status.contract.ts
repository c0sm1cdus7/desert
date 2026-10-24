// The props of Status: a block that says why there is nothing to show: an empty collection, an offline controller or a
// note. `title` is the one sentence (a level-2 heading when `heading`), `description` what to do next; `icon` one of the
// status glyphs; `tone` the meaning (offline announces itself as a status, a note is a note); `size: "compact"` sets it
// as a caption beside its glyph instead of a centred block.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const StatusContract = {
  props: Type.Object({
    title: text,
    description: Type.Optional(text),
    icon: Type.Optional(Type.Union([Type.Literal("info"), Type.Literal("search"), Type.Literal("image-off")])),
    tone: Type.Union([Type.Literal("neutral"), Type.Literal("offline"), Type.Literal("note")]),
    size: Type.Union([Type.Literal("regular"), Type.Literal("compact")]),
    heading: Type.Boolean(),
  }, { additionalProperties: false }),
  marks: ["data-status"],
} as const;
