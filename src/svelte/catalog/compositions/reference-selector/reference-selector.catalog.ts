// ReferenceSelector: the labels control that chooses referenced objects in a popover opened from a field well, and can
// create a new one when the host installs that capability.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReferenceSelectorContract } from "./reference-selector.contract.ts";

export const ReferenceSelector = defineComposition({
  id: "reference-selector",
  purpose: { key: "referenceSelector.purpose" },
  messages: ["referenceSelector.purpose", "referenceSelector.unavailable", "referenceSelector.choose", "referenceSelector.loading",
    "referenceSelector.empty", "referenceSelector.check", "referenceSelector.name", "referenceSelector.color", "referenceSelector.cancel"],
  owner: { entry: "ReferenceSelector.svelte" },
  uses: ["action", "choice", "column", "field", "popover", "stack-layout", "text"], approval: "none", contract: ReferenceSelectorContract,
} as const);
