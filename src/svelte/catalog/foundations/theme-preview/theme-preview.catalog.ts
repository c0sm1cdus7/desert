// ThemePreview: a finite miniature of the running interface in one mode, tint and wallpaper, so a person can compare
// Dark and Light before choosing. It is the appearance-preview composition made a foundation.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ThemePreviewContract } from "./theme-preview.contract.ts";

export const ThemePreview = defineFoundation({
  id: "theme-preview",
  purpose: "Compare Dark and Light using the same surface, tint and wallpaper tokens as the running interface.",
  owner: { entry: "ThemePreview.svelte" },
  shape: "radius", states: ["default"],
  variants: { mode: ["light", "dark"] },
  approval: "required", contract: ThemePreviewContract,
} as const);
