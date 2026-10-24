// The props of MaskedInput. `value` is the canonical value and `mask` its editing syntax; `identity` scopes the edit
// history; `display` is the formatted text (bindable). `onvalue(value, valid, complete)` reports every edit, so it is a
// three-argument prop, not an event. The rest are the attributes of the input it renders.
import { Type } from "@sinclair/typebox";
import { InputMaskSchema } from "../../../../interaction/input-mask.ts";

export const MaskedInputContract = {
  props: Type.Object({
    value: Type.String(),
    mask: InputMaskSchema,
    identity: Type.Optional(Type.String()),
    display: Type.Optional(Type.String()),
    id: Type.Optional(Type.String()),
    placeholder: Type.Optional(Type.String()),
    disabled: Type.Optional(Type.Boolean()),
    required: Type.Optional(Type.Boolean()),
    "aria-required": Type.Optional(Type.Boolean()),
    "aria-invalid": Type.Optional(Type.Boolean()),
    "aria-label": Type.Optional(Type.String()),
    "aria-describedby": Type.Optional(Type.String()),
    onvalue: Type.Function([Type.String(), Type.Boolean(), Type.Boolean()], Type.Void()),
  }, { additionalProperties: false }),
} as const;
