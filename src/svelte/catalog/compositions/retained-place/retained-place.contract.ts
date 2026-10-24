// The props of RetainedPlace: whether its place is `active` (it owns surface activity) and `visible` (shown; defaults to
// `active`). Its `children` slot is the retained place content, kept mounted while hidden.
import { Type } from "@sinclair/typebox";

export const RetainedPlaceContract = {
  props: Type.Object({
    active: Type.Boolean(),
    visible: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
