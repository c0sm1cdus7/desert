// AppearancePreferences: mode, text size, tint and wallpaper choices, each previewed in place before it applies.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AppearancePreferencesContract } from "./appearance-preferences.contract.ts";

export const AppearancePreferences = defineComposition({
  id: "appearance-preferences",
  purpose: { key: "appearancePreferences.purpose" },
  messages: ["appearancePreferences.purpose", "appearancePreferences.appearance", "appearancePreferences.textSize", "appearancePreferences.tint",
    "appearancePreferences.wallpaper"],
  owner: { entry: "AppearancePreferences.svelte" },
  uses: ["choice", "column", "stack-layout"], approval: "required", contract: AppearancePreferencesContract,
} as const);
