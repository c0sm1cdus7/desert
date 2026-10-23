// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AppearancePreviewContract } from "./appearance-preview.contract.ts";

export const AppearancePreview = defineComposition({
  id: "appearance-preview",
  purpose: "Compare Dark and Light using the same surface, tint and wallpaper tokens as the running interface.",
  owner: { entry: "AppearancePreview.svelte" },
  uses: ["wallpaper"], approval: "none", contract: AppearancePreviewContract,
} as const);
