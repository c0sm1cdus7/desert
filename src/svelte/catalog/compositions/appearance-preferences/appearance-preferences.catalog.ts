// AppearancePreferences: mode, text size, tint and wallpaper choices, each previewed in place before it applies.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AppearancePreferencesContract } from "./appearance-preferences.contract.ts";

export const AppearancePreferences = defineComposition({
  id: "appearance-preferences",
  purpose: "Choose mode, text size, tint and a system wallpaper with immediate local preview.",
  owner: { entry: "AppearancePreferences.svelte" },
  uses: ["appearance-preview", "selection-field", "stack-layout", "wallpaper"], approval: "required", contract: AppearancePreferencesContract,
} as const);
