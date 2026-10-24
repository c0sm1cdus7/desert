// View region: the frame of one view's content, or of one item of it, marked so navigation can find and reveal it.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ViewRegionContract } from "./view-region.contract.ts";

export const ViewRegion = defineFoundation({
  id: "view-region",
  purpose: "Frame one view's content or one of its items with the identity navigation reveals; bare renders content unframed.",
  owner: { entry: "ViewRegion.svelte" },
  shape: "none", states: ["default"],
  variants: { kind: ["view", "item", "bare"] },
  slots: { children: { accepts: ["appearance", "feedback", "identity", "information", "inspection-content", "media-content",
    "place-heading", "stack-layout", "view-attention", "view-item", "view-related-selection"] } },
  approval: "required", contract: ViewRegionContract,
} as const);
