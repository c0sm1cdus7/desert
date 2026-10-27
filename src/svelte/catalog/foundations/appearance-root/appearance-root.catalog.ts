// AppearanceRoot: applies the chosen appearance (theme, tint, wallpaper, text size) to the document root and publishes
// the platform colour scheme, so no composition touches the root or calls matchMedia.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { AppearanceRootContract } from "./appearance-root.contract.ts";

export const AppearanceRoot = defineFoundation({
  id: "appearance-root",
  purpose: { key: "appearanceRoot.purpose" }, messages: ["appearanceRoot.purpose"],
  owner: { entry: "AppearanceRoot.svelte", parts: ["appearance-root.ts"] },
  shape: "none", states: ["default"], approval: "required", contract: AppearanceRootContract,
} as const);
