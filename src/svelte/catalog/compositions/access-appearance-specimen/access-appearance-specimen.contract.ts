// The props of AccessAppearanceSpecimen: which access or appearance owner to exercise locally in the bank.
import { Type } from "@sinclair/typebox";

export const AccessAppearanceSpecimenContract = {
  props: Type.Object({
    owner: Type.Union([Type.Literal("AppearancePreferences"), Type.Literal("AppearancePreview"), Type.Literal("SeedAvatar"),
      Type.Literal("AvatarShuffle"), Type.Literal("Wallpaper"), Type.Literal("AccessExperience"), Type.Literal("LockScreen")]),
  }, { additionalProperties: false }),
} as const;
