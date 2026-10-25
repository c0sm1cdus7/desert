// The props of StackLayout. `title` names the group (its legend), `description` explains it below the content,
// `required` marks the group as required, and `headingVisibility` keeps the title for assistive technology only.
import { Type } from "@sinclair/typebox";

export const StackLayoutContract = {
  props: Type.Object({
    title: Type.String(),
    description: Type.Optional(Type.String()),
    required: Type.Optional(Type.Boolean()),
    headingVisibility: Type.Optional(Type.Union([Type.Literal("visible"), Type.Literal("accessible")])),
  }, { additionalProperties: false }),
} as const;
