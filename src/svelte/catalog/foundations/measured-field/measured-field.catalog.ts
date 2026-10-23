// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MeasuredFieldContract } from "./measured-field.contract.ts";

export const MeasuredField = defineFoundation({
  id: "measured-field",
  purpose: "Declared as found at the start of the migration: MeasuredField.svelte.",
  owner: { entry: "MeasuredField.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: MeasuredFieldContract,
} as const);
