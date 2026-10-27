// RelatedSelection: one titled stack per related group, its items as Choice rows led by their pictures, with loading and
// empty states and a retry on error.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { RelatedSelectionContract } from "./related-selection.contract.ts";

export const RelatedSelection = defineComposition({
  id: "related-selection",
  purpose: { key: "relatedSelection.purpose" },
  messages: ["relatedSelection.purpose", "relatedSelection.loading", "relatedSelection.empty", "relatedSelection.check", "relatedSelection.retry"],
  owner: { entry: "RelatedSelection.svelte" },
  uses: ["action", "choice", "information", "list", "stack-layout", "text"], approval: "none", contract: RelatedSelectionContract,
} as const);
