// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { RelatedSelectionContract } from "./related-selection.contract.ts";

export const RelatedSelection = defineComposition({
  id: "related-selection",
  purpose: "Edit related objects within the current context using shared choices and explicit local feedback.",
  owner: { entry: "RelatedSelection.svelte" },
  uses: ["artwork-placeholder", "choice-list", "choice-row", "feedback", "grouped-panel", "image", "information", "stack-layout"], approval: "none", contract: RelatedSelectionContract,
} as const);
