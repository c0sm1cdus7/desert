// The props of SurfaceFrame: the validated frame (top toolbar, content, bottom toolbar), an optional resolved view that
// replaces the frame content, and how it is presented. `invoke` runs a toolbar or form intent; `edit` receives a text
// field change and `controlEvent` a form control event.
import { Type } from "@sinclair/typebox";
import { SurfaceFrameSchema } from "../../../../interaction/surface-frame.ts";
import type { SurfaceIntent } from "../../../../interaction/intent.ts";
import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";
import type { ResolvedView } from "../../../../views/resolved.ts";

export const SurfaceFrameContract = {
  props: Type.Object({
    frame: SurfaceFrameSchema,
    body: Type.Optional(Type.Union([Type.Unsafe<ResolvedView>(), Type.Undefined()])),
    presentation: Type.Optional(Type.Union([Type.Literal("standard"), Type.Literal("message"), Type.Literal("transient")])),
    invoke: Type.Function([Type.Unsafe<SurfaceIntent>()], Type.Void()),
    edit: Type.Optional(Type.Union([Type.Function([Type.String(), Type.String()], Type.Void()), Type.Undefined()])),
    controlEvent: Type.Optional(Type.Union([Type.Function([Type.Unsafe<FormControlEvent>()], Type.Void()), Type.Undefined()])),
  }, { additionalProperties: false }),
} as const;
