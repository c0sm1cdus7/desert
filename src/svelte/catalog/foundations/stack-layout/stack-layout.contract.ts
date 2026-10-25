// The props of StackLayout. `title` names the group (its legend), `description` explains it below the content,
// `required` marks the group as required, and `headingVisibility` keeps the title for assistive technology only.
// `titleAxis` says where the title starts: on the row inset where the text of the rows, fields and lists it holds reads
// ("row", the default), or on the group's edge where unframed controls it holds (chips, an action) stand ("edge").
import { Type } from "@sinclair/typebox";

export const StackLayoutContract = {
  props: Type.Object({
    title: Type.String(),
    description: Type.Optional(Type.String()),
    required: Type.Optional(Type.Boolean()),
    headingVisibility: Type.Optional(Type.Union([Type.Literal("visible"), Type.Literal("accessible")])),
    titleAxis: Type.Optional(Type.Union([Type.Literal("row"), Type.Literal("edge")])),
  }, { additionalProperties: false }),
} as const;
