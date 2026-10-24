// The props of ColorBullet: the name of a label's color. Six names have their own paint; any other reads as muted.
import { Type } from "@sinclair/typebox";

export const ColorBulletContract = {
  props: Type.Object({ color: Type.String() }, { additionalProperties: false }),
} as const;
