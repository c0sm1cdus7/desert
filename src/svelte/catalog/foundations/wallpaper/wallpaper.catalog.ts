// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { WallpaperContract } from "./wallpaper.contract.ts";

export const Wallpaper = defineFoundation({
  id: "wallpaper",
  purpose: "Provide system-generated Silk, Mist or Plain backgrounds that follow the selected appearance.",
  owner: { entry: "Wallpaper.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: WallpaperContract,
} as const);
