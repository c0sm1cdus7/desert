// RelatedSelection: one checklist per related group, with previews, loading and empty states and a retry on error.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { RelatedSelectionContract } from "./related-selection.contract.ts";

export const RelatedSelection = defineComposition({
  id: "related-selection",
  purpose: "Edit related objects within the current context using shared choices and explicit local feedback.",
  owner: { entry: "RelatedSelection.svelte" },
  uses: ["artwork-placeholder", "choice-list", "choice-row", "feedback", "grouped-panel", "image", "information", "stack-layout"], approval: "none", contract: RelatedSelectionContract,
} as const);
