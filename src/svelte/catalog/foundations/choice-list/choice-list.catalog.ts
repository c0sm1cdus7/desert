// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ChoiceListContract } from "./choice-list.contract.ts";

export const ChoiceList = defineFoundation({
  id: "choice-list",
  purpose: "Declared as found at the start of the migration: ChoiceList.svelte.",
  owner: { entry: "ChoiceList.svelte", vendor: ["checkbox", "radio-group"] },
  shape: "none", states: ["default"], approval: "required", contract: ChoiceListContract,
} as const);
