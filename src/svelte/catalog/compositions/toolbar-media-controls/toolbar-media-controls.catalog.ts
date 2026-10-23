// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ToolbarMediaControlsContract } from "./toolbar-media-controls.contract.ts";

export const ToolbarMediaControls = defineComposition({
  id: "toolbar-media-controls",
  purpose: "Declared as found at the start of the migration: ToolbarMediaControls.svelte.",
  owner: { entry: "ToolbarMediaControls.svelte" },
  uses: ["artwork-placeholder", "image", "playback-controls"], approval: "none", contract: ToolbarMediaControlsContract,
} as const);
