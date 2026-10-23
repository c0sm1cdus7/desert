// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ClearInputContract } from "./clear-input.contract.ts";

export const ClearInput = defineFoundation({
  id: "clear-input",
  purpose: "Declared as found at the start of the migration: ClearInput.svelte.",
  owner: { entry: "ClearInput.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: ClearInputContract,
} as const);
