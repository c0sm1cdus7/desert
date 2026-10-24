// The props of Problem: whether the message is open, its title and description, how severe it is, whether it is
// locked (cannot be dismissed), and `close`, called when the person dismisses an unlocked message.
import { Type } from "@sinclair/typebox";

export const ProblemContract = {
  props: Type.Object({
    open: Type.Boolean(),
    title: Type.String(),
    description: Type.String(),
    close: Type.Function([], Type.Void()),
    severity: Type.Optional(Type.Union([Type.Literal("error"), Type.Literal("warning")])),
    locked: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
