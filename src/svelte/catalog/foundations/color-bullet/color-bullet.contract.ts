// The props of ColorBullet: one of the finite reference colors, each with its own paint.
import { Type } from "@sinclair/typebox";
import { ReferenceColorSchema } from "../../../../interaction/reference-color.ts";

export const ColorBulletContract = {
  props: Type.Object({ color: ReferenceColorSchema }, { additionalProperties: false }),
} as const;
