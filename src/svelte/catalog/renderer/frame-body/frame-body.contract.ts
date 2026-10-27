// The props of FrameBody: the `content` of a surface frame. `invoke` runs a surface intent, `edit(name, value)` reports a
// text field edit and `controlEvent` a file, label, reference or related-selection control event; `messageDialog`
// marks a message shown as a modal dialog.
import { Type } from "@sinclair/typebox";
import { FrameContentSchema } from "../../../../interaction/surface-frame.ts";
import type { SurfaceIntent } from "../../../../interaction/intent.ts";
import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";

export const FrameBodyContract = {
  props: Type.Object({
    content: FrameContentSchema,
    messageDialog: Type.Optional(Type.Boolean()),
    invoke: Type.Function([Type.Unsafe<SurfaceIntent>()], Type.Void()),
    edit: Type.Function([Type.String(), Type.String()], Type.Void()),
    controlEvent: Type.Optional(Type.Union([Type.Function([Type.Unsafe<FormControlEvent>()], Type.Void()), Type.Undefined()])),
  }, { additionalProperties: false }),
} as const;
