// The props of TextInput. `primitive` picks a single line or a multiline editor; `mask` (single line only, as the entry
// renders it) installs a decimal editing syntax; `purpose` tells the browser what a single line holds. `change` is the
// written value, emitted on input and on blur.
import { Type } from "@sinclair/typebox";
import { InputMaskSchema } from "../../../../interaction/input-mask.ts";

export const TextInputContract = {
  props: Type.Object({
    primitive: Type.Union([Type.Literal("input.text"), Type.Literal("input.multiline")]),
    label: Type.String(),
    value: Type.Optional(Type.String()),
    required: Type.Optional(Type.Boolean()),
    invalid: Type.Optional(Type.Boolean()),
    error: Type.Optional(Type.String()),
    helper: Type.Optional(Type.String()),
    disabled: Type.Optional(Type.Boolean()),
    identity: Type.Optional(Type.String()),
    mask: Type.Optional(InputMaskSchema),
    maxLength: Type.Optional(Type.Integer()),
    purpose: Type.Optional(Type.Union([Type.Literal("text"), Type.Literal("username"), Type.Literal("new-password"),
      Type.Literal("current-password")])),
  }, { additionalProperties: false }),
  events: Type.Object({ change: Type.String() }, { additionalProperties: false }),
} as const;
