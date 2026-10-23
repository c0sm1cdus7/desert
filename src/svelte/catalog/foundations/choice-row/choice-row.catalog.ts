// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ChoiceRowContract } from "./choice-row.contract.ts";

export const ChoiceRow = defineFoundation({
  id: "choice-row",
  purpose: "Declared as found at the start of the migration: ChoiceRow.svelte.",
  owner: { entry: "ChoiceRow.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: ChoiceRowContract,
} as const);
