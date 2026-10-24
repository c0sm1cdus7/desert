// MediaGrid: a collection whose presentation is media, as artwork tiles in a grid or as rows in a grouped list, with its
// loading, empty and offline state when there is nothing to show.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaGridContract } from "./media-grid.contract.ts";

export const MediaGrid = defineComposition({
  id: "media-grid",
  purpose: "Browse a media collection as artwork tiles or list rows and open one item.",
  owner: { entry: "MediaGrid.svelte" },
  uses: ["artwork-placeholder", "attention-indicator", "collection-state", "grouped-panel", "image"], approval: "none", contract: MediaGridContract,
} as const);
