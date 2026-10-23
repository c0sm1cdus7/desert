// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReferenceSelectorContract } from "./reference-selector.contract.ts";

export const ReferenceSelector = defineComposition({
  id: "reference-selector",
  purpose: "Choose referenced objects through a labeled field and the shared selection popover.",
  owner: { entry: "ReferenceSelector.svelte" },
  uses: ["choice-list", "choice-row", "color-bullet", "field-well-content", "reference-values", "selection-field", "stack-layout", "text-input"], approval: "none", contract: ReferenceSelectorContract,
} as const);
