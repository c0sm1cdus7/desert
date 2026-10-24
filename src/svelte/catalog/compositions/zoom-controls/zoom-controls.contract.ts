// The props of ZoomControls: the current media `scale` (1 is unzoomed) and `onreset`, called when the person resets the
// zoom (it is the reset button's own press handler). It emits `zoom` with the next scale, one step out or in.
import { Type } from "@sinclair/typebox";

export const ZoomControlsContract = {
  props: Type.Object({
    scale: Type.Number(),
    onreset: Type.Function([], Type.Void()),
  }, { additionalProperties: false }),
  events: Type.Object({ zoom: Type.Number() }, { additionalProperties: false }),
} as const;
