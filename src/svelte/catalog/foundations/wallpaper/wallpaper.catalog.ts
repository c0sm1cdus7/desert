// Wallpaper: the system-generated background behind a surface, Silk, Mist or Plain, following the appearance mode.
// As a preview it is a bounded swatch for choosing one.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { WallpaperContract } from "./wallpaper.contract.ts";

export const Wallpaper = defineFoundation({
  id: "wallpaper",
  purpose: { key: "wallpaper.purpose" }, messages: ["wallpaper.purpose"],
  owner: { entry: "Wallpaper.svelte" },
  shape: "none", states: ["default", "preview"],
  variants: { wallpaper: ["silk", "mist", "plain"] },
  approval: "required", contract: WallpaperContract,
} as const);
