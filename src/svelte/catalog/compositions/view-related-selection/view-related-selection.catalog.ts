// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewRelatedSelectionContract } from "./view-related-selection.contract.ts";

export const ViewRelatedSelection = defineComposition({
  id: "view-related-selection",
  purpose: "Declared as found at the start of the migration: ViewRelatedSelection.svelte.",
  owner: { entry: "ViewRelatedSelection.svelte" },
  uses: ["related-selection"], approval: "none", contract: ViewRelatedSelectionContract,
} as const);
