// MediaGrid: a collection whose presentation is media, as artwork cards in a tile grid or as rows in a list, with its
// loading, empty and offline state when there is nothing to show.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaGridContract } from "./media-grid.contract.ts";

export const MediaGrid = defineComposition({
  id: "media-grid",
  purpose: { key: "mediaGrid.purpose" },
  messages: ["mediaGrid.purpose", "mediaGrid.open", "mediaGrid.position"],
  owner: { entry: "MediaGrid.svelte", parts: ["media-grid-items.ts"] },
  uses: ["card", "collection-state", "grid", "list", "row"], approval: "none", contract: MediaGridContract,
} as const);
