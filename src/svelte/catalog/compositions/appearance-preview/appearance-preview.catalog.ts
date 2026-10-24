// AppearancePreview: a finite miniature of the running interface in one mode, tint and wallpaper, so a person can compare
// Dark and Light before choosing.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AppearancePreviewContract } from "./appearance-preview.contract.ts";

export const AppearancePreview = defineComposition({
  id: "appearance-preview",
  purpose: "Compare Dark and Light using the same surface, tint and wallpaper tokens as the running interface.",
  owner: { entry: "AppearancePreview.svelte" },
  uses: ["wallpaper"], approval: "none", contract: AppearancePreviewContract,
} as const);
