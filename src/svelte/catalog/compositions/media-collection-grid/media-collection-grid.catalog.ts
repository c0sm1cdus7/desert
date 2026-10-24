// MediaCollectionGrid: a collection drawn as a grid of covers with title and item count; opening one selects its record.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaCollectionGridContract } from "./media-collection-grid.contract.ts";

export const MediaCollectionGrid = defineComposition({
  id: "media-collection-grid",
  purpose: "Show media collections as a grid of covers with title and item count, and open the one the person picks.",
  owner: { entry: "MediaCollectionGrid.svelte" },
  uses: ["attention-indicator", "collection-state", "image"], approval: "none", contract: MediaCollectionGridContract,
} as const);
