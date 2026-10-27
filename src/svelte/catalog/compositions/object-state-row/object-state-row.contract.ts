// The props of ObjectStateRow: one object state selector (field, label, current value, options with their journeys).
// It emits `select` with the journey of the option the person picks, when that option is available.
import { Type } from "@sinclair/typebox";
import { ObjectSelectorSchema } from "../../../../interaction/surface-frame.ts";

export const ObjectStateRowContract = {
  props: Type.Object({ selector: ObjectSelectorSchema }, { additionalProperties: false }),
  events: Type.Object({ select: Type.String() }, { additionalProperties: false }),
} as const;
