// ChoiceRow: one pressable row of a choice list. Its label holds the choice's text and description, and its slot holds
// the checkbox or radio that the row's label activates.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ChoiceRowContract } from "./choice-row.contract.ts";

export const ChoiceRow = defineFoundation({
  id: "choice-row",
  purpose: "One pressable row of a choice list whose label activates the checkbox or radio it holds.",
  owner: { entry: "ChoiceRow.svelte" },
  shape: "none", states: ["default", "described", "disabled"],
  slots: { children: { accepts: ["choice-list", "color-bullet", "image", "artwork-placeholder"] } },
  approval: "required", contract: ChoiceRowContract,
} as const);
