// MediaCollectionGrid: a collection drawn as a grid of covers with title and item count; opening one selects its record.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaCollectionGridContract } from "./media-collection-grid.contract.ts";

export const MediaCollectionGrid = defineComposition({
  id: "media-collection-grid",
  purpose: { key: "mediaCollectionGrid.purpose" },
  messages: ["mediaCollectionGrid.purpose", "mediaCollectionGrid.open", "mediaCollectionGrid.countOne", "mediaCollectionGrid.countMany"],
  owner: { entry: "MediaCollectionGrid.svelte" },
  uses: ["card", "collection-state", "grid"], approval: "none", contract: MediaCollectionGridContract,
} as const);
