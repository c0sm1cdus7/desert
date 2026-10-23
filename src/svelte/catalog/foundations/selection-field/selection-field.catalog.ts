// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SelectionFieldContract } from "./selection-field.contract.ts";

export const SelectionField = defineFoundation({
  id: "selection-field",
  purpose: "Declared as found at the start of the migration: SelectionField.svelte.",
  owner: { entry: "SelectionField.svelte", parts: ["SelectionList.svelte"], vendor: ["popover"] },
  shape: "radius", states: ["default"], approval: "required", contract: SelectionFieldContract,
} as const);
