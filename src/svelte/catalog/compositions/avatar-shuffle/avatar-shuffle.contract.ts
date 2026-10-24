// The props of AvatarShuffle: the current avatar `seed`, `disabled` while the form is busy, and `onchange`, raised with a
// newly generated seed each time the avatar is activated.
import { Type } from "@sinclair/typebox";

export const AvatarShuffleContract = {
  props: Type.Object({
    seed: Type.String(),
    disabled: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  events: Type.Object({
    change: Type.String(),
  }, { additionalProperties: false }),
} as const;
