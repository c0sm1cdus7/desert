// The props of Fields: the `fields` of a form frame, `edit`, called with a field's name and new value, and
// `controlEvent`, called with the form control events of file and label fields.
import { Type } from "@sinclair/typebox";
import type { FrameContent } from "../../../../interaction/surface-frame.ts";
import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";

export const FieldsContract = {
  props: Type.Object({
    fields: Type.Unsafe<Extract<FrameContent, { kind: "form" }>["fields"]>(),
    edit: Type.Function([Type.String(), Type.String()], Type.Void()),
    controlEvent: Type.Function([Type.Unsafe<FormControlEvent>()], Type.Void()),
  }, { additionalProperties: false }),
} as const;
