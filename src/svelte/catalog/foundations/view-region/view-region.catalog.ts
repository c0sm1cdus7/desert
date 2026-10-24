// View region: the frame of one view's content, of one of its items, of a place's document, or of a place retained while
// hidden, marked so navigation can find and reveal it; bare renders content unframed.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ViewRegionContract } from "./view-region.contract.ts";

export const ViewRegion = defineFoundation({
  id: "view-region",
  purpose: "Frame one view's content, one of its items, a place's document or a retained place with the identity navigation reveals; bare renders content unframed.",
  owner: { entry: "ViewRegion.svelte", parts: ["view-region.css"], mechanisms: ["reveal"] },
  shape: "none", states: ["default", "hidden"],
  variants: { kind: ["view", "item", "bare", "document", "retained"] },
  slots: { children: { accepts: ["appearance", "catalog-home", "column", "feedback", "gallery", "identity", "information", "inspection-catalog",
    "inspection-content", "local-exercises", "media-content", "node-renderer", "place-heading", "public-catalog-bank", "stack", "stack-item", "stack-layout",
    "view-attention", "view-content", "view-item", "view-region", "view-related-selection"] } },
  approval: "required", contract: ViewRegionContract,
} as const);
