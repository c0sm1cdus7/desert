// ReferenceSelector: the labels control that chooses referenced objects in a popover and can create a new one.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReferenceSelectorContract } from "./reference-selector.contract.ts";

export const ReferenceSelector = defineComposition({
  id: "reference-selector",
  purpose: "Choose referenced objects through a labeled field and the shared selection popover.",
  owner: { entry: "ReferenceSelector.svelte" },
  uses: ["choice-list", "choice-row", "color-bullet", "field-well-content", "icon", "reference-values", "selection-field", "stack-layout", "text-input"], approval: "none", contract: ReferenceSelectorContract,
} as const);
