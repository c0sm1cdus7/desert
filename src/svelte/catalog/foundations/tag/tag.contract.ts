// The props of Tag. A chip is a toned badge (a label of a field, a tag control) that can offer its own remove button,
// named by `removeLabel`; text is a reference read in a fact (its name beside its color bullet). `state` says whether the
// tag still names something known; an unavailable reference has no color. `remove` fires when the person removes it.
// The tone axis spells the tag node's tones (TagToneSchema) as literals, because rule J reads an axis as literals; the
// foundation test proves the two lists are one.
import { Type } from "@sinclair/typebox";
import { ReferenceColorSchema } from "../../../../interaction/reference-color.ts";
import { text } from "../../../../views/definition.ts";

export const TagContract = {
  props: Type.Intersect([Type.Object({
    label: text,
    disabled: Type.Boolean(),
  }, { additionalProperties: false }), Type.Union([
    Type.Object({ state: Type.Literal("known"), color: Type.Optional(ReferenceColorSchema) }, { additionalProperties: false }),
    Type.Object({ state: Type.Literal("unavailable"), color: Type.Optional(Type.Undefined()) }, { additionalProperties: false }),
  ]), Type.Union([
    Type.Object({ presentation: Type.Literal("chip"), tone: Type.Union([Type.Literal("neutral"), Type.Literal("accent"),
      Type.Literal("success"), Type.Literal("warning"), Type.Literal("destructive")]), removable: Type.Boolean(), removeLabel: Type.Optional(text) },
      { additionalProperties: false }),
    Type.Object({ presentation: Type.Literal("text"), tone: Type.Optional(Type.Undefined()), removable: Type.Literal(false),
      removeLabel: Type.Optional(Type.Undefined()) }, { additionalProperties: false }),
  ])]),
  events: Type.Object({ remove: Type.Void() }, { additionalProperties: false }),
  marks: ["data-tag", "data-tone"],
} as const;
