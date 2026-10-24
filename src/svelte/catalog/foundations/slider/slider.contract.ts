// The props of Slider: its accessible `label`, the current `value` within `min` and `max`, the `step` between values, and
// whether it is `disabled`. It emits `change` with each value the person sets (dragging, pressing the track or keys).
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const SliderContract = {
  props: Type.Object({
    label: text,
    value: Type.Number(),
    min: Type.Number(),
    max: Type.Number(),
    step: Type.Number({ exclusiveMinimum: 0 }),
    disabled: Type.Boolean(),
  }, { additionalProperties: false }),
  events: Type.Object({ change: Type.Number() }, { additionalProperties: false }),
} as const;
