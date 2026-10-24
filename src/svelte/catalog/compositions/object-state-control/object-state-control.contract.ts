// The props of ObjectStateControl: the object's state selectors, one row each. `select` carries the journey of the
// chosen state.
import { Type } from "@sinclair/typebox";
import { ObjectSelectorSchema } from "../../../../interaction/surface-frame.ts";

export const ObjectStateControlContract = {
  props: Type.Object({ selectors: Type.Array(ObjectSelectorSchema) }, { additionalProperties: false }),
  events: Type.Object({ select: Type.String() }, { additionalProperties: false }),
} as const;
