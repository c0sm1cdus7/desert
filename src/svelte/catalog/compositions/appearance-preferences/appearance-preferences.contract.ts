// The props of AppearancePreferences: the current appearance (mode, text size, tint, wallpaper) and `disabled`
// (default false). It emits `change` with the complete next appearance when the person picks another choice.
import { Type } from "@sinclair/typebox";
import type { AppearancePreferences } from "../../../infra/appearance-preferences.ts";

export const AppearancePreferencesContract = {
  props: Type.Object({
    value: Type.Unsafe<AppearancePreferences>(),
    disabled: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  events: Type.Object({ change: Type.Unsafe<AppearancePreferences>() }, { additionalProperties: false }),
} as const;
