// StackLayout: a titled group of content in a place, as a fieldset with a legend, the grouped content and an optional
// description. The title can stay visible or be kept for assistive technology only.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { StackLayoutContract } from "./stack-layout.contract.ts";

export const StackLayout = defineFoundation({
  id: "stack-layout",
  purpose: { key: "stackLayout.purpose" }, messages: ["stackLayout.purpose"],
  owner: { entry: "StackLayout.svelte", parts: ["stack-layout.css"] },
  shape: "none", states: ["default", "described", "required"],
  variants: { headingVisibility: ["visible", "accessible"], titleAxis: ["row", "edge"] },
  slots: { children: { accepts: ["action", "choice", "collection", "collection-state", "column", "fact-row", "fact-value", "field", "information", "list", "object-state-row", "popover", "shared-owner-specimen", "stack-item", "text", "view-destination-link", "view-item"] } },
  approval: "required", contract: StackLayoutContract,
} as const);
