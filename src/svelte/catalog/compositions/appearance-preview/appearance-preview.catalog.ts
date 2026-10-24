// AppearancePreview: a finite miniature of the running interface in one mode, tint and wallpaper, so a person can compare
// Dark and Light before choosing.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AppearancePreviewContract } from "./appearance-preview.contract.ts";

export const AppearancePreview = defineComposition({
  id: "appearance-preview",
  purpose: { key: "appearancePreview.purpose" }, messages: ["appearancePreview.purpose"],
  owner: { entry: "AppearancePreview.svelte" },
  uses: ["theme-preview"], approval: "none", contract: AppearancePreviewContract,
} as const);
