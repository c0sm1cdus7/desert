// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaCollectionGridContract } from "./media-collection-grid.contract.ts";

export const MediaCollectionGrid = defineComposition({
  id: "media-collection-grid",
  purpose: "Declared as found at the start of the migration: MediaCollectionGrid.svelte.",
  owner: { entry: "MediaCollectionGrid.svelte" },
  uses: ["attention-indicator", "collection-state", "image"], approval: "none", contract: MediaCollectionGridContract,
} as const);
