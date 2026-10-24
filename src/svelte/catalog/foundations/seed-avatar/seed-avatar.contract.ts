// The props of SeedAvatar. `seed` alone decides the drawing; `label` names it for assistive technology; `size` picks the
// vendor avatar size.
import { Type } from "@sinclair/typebox";

export const SeedAvatarContract = {
  props: Type.Object({
    seed: Type.String(),
    label: Type.Optional(Type.String()),
    size: Type.Optional(Type.Union([Type.Literal("portrait"), Type.Literal("compact")])),
  }, { additionalProperties: false }),
} as const;
