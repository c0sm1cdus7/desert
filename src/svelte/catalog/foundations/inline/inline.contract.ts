// The props of Inline: pieces in a horizontal sequence, separated by a step of the spacing scale. `align` places them on
// the block axis (centred when omitted), `justify` on the inline axis (start when omitted); `overflow` wraps them,
// scrolls them in a rail, or neither. A scroll rail is a labelled region, so `label` is given exactly then.
import { Type } from "@sinclair/typebox";
import { GapSchema } from "../../../../interaction/spacing.ts";
import { text } from "../../../../views/definition.ts";

export const InlineContract = {
  props: Type.Intersect([Type.Object({
    gap: GapSchema,
    align: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("center"), Type.Literal("baseline"), Type.Literal("end")])),
    justify: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("center"), Type.Literal("end"), Type.Literal("between")])),
  }, { additionalProperties: false }), Type.Union([
    Type.Object({ overflow: Type.Union([Type.Literal("wrap"), Type.Literal("none")]), label: Type.Optional(Type.Undefined()) }, { additionalProperties: false }),
    Type.Object({ overflow: Type.Literal("scroll"), label: text }, { additionalProperties: false }),
  ])]),
} as const;
