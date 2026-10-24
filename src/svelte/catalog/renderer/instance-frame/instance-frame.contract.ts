// The props of InstanceFrame: the transient frame of one mounted instance, the resolved view it may carry as its body,
// and the callbacks it keeps for that instance even after teardown (`invoke`, `edit`, `controlEvent`).
import { Type } from "@sinclair/typebox";
import type { SurfaceFrame } from "../../../../interaction/surface-frame.ts";
import type { SurfaceIntent } from "../../../../interaction/intent.ts";
import type { ResolvedView } from "../../../../views/resolved.ts";
import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";

export const InstanceFrameContract = {
  props: Type.Object({
    frame: Type.Unsafe<SurfaceFrame>(),
    body: Type.Optional(Type.Union([Type.Unsafe<ResolvedView>(), Type.Undefined()])),
    invoke: Type.Function([Type.Unsafe<SurfaceIntent>()], Type.Void()),
    edit: Type.Optional(Type.Union([Type.Function([Type.String(), Type.String()], Type.Void()), Type.Undefined()])),
    controlEvent: Type.Optional(Type.Union([Type.Function([Type.Unsafe<FormControlEvent>()], Type.Void()), Type.Undefined()])),
  }, { additionalProperties: false }),
} as const;
