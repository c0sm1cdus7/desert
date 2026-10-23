// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AppearancePreferencesContract } from "./appearance-preferences.contract.ts";

export const AppearancePreferences = defineComposition({
  id: "appearance-preferences",
  purpose: "Choose mode, text size, tint and a system wallpaper with immediate local preview.",
  owner: { entry: "AppearancePreferences.svelte" },
  uses: ["appearance-preview", "selection-field", "stack-layout", "wallpaper"], approval: "required", contract: AppearancePreferencesContract,
} as const);
