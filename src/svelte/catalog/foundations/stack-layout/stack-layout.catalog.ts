// StackLayout: a titled group of content in a place, as a fieldset with a legend, the grouped content and an optional
// description. The title can stay visible or be kept for assistive technology only.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { StackLayoutContract } from "./stack-layout.contract.ts";

export const StackLayout = defineFoundation({
  id: "stack-layout",
  purpose: "Group related content under one title, with an optional description and required mark.",
  owner: { entry: "StackLayout.svelte", parts: ["stack-layout.css"] },
  shape: "none", states: ["default", "described", "required"],
  variants: { headingVisibility: ["visible", "accessible"] },
  slots: { children: { accepts: ["action", "character-counter", "choice", "choice-list", "collection", "collection-state", "fact-row", "fact-value", "feedback", "field", "grouped-panel", "information", "list", "measured-field", "object-state-row", "selection-field", "shared-owner-specimen", "stack-item", "text", "view-destination-link", "view-item"] } },
  approval: "required", contract: StackLayoutContract,
} as const);
