// The props of TextInput. `primitive` picks a single line or a multiline editor; `mask` (single line only: the multiline
// variant cannot take one) installs a decimal editing syntax; `purpose` tells the browser what a single line holds.
// `change` is the written value, emitted on input and on blur.
import { Type } from "@sinclair/typebox";
import { InputMaskSchema } from "../../../../interaction/input-mask.ts";

export const TextInputContract = {
  props: Type.Intersect([Type.Object({
    label: Type.String(),
    value: Type.Optional(Type.String()),
    required: Type.Optional(Type.Boolean()),
    invalid: Type.Optional(Type.Boolean()),
    error: Type.Optional(Type.String()),
    helper: Type.Optional(Type.String()),
    disabled: Type.Optional(Type.Boolean()),
    identity: Type.Optional(Type.String()),
    maxLength: Type.Optional(Type.Integer()),
    purpose: Type.Optional(Type.Union([Type.Literal("text"), Type.Literal("username"), Type.Literal("new-password"),
      Type.Literal("current-password")])),
  }, { additionalProperties: false }), Type.Union([
    Type.Object({ primitive: Type.Literal("input.text"), mask: Type.Optional(InputMaskSchema) }, { additionalProperties: false }),
    Type.Object({ primitive: Type.Literal("input.multiline"), mask: Type.Optional(Type.Undefined()) }, { additionalProperties: false }),
  ])]),
  events: Type.Object({ change: Type.String() }, { additionalProperties: false }),
} as const;
