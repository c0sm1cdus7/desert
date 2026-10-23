// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ChoiceItemContract } from "./choice-item.contract.ts";

export const ChoiceItem = defineFoundation({
  id: "choice-item",
  purpose: "Declared as found at the start of the migration: ChoiceItem.svelte.",
  owner: { entry: "ChoiceItem.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: ChoiceItemContract,
} as const);
