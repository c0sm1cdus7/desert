// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaGridContract } from "./media-grid.contract.ts";

export const MediaGrid = defineComposition({
  id: "media-grid",
  purpose: "Declared as found at the start of the migration: MediaGrid.svelte.",
  owner: { entry: "MediaGrid.svelte" },
  uses: ["artwork-placeholder", "attention-indicator", "collection-state", "grouped-panel", "image"], approval: "none", contract: MediaGridContract,
} as const);
