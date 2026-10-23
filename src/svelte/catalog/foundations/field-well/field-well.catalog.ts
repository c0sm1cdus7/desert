// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FieldWellContract } from "./field-well.contract.ts";

export const FieldWell = defineFoundation({
  id: "field-well",
  purpose: "Declared as found at the start of the migration: FieldWell.svelte.",
  owner: { entry: "FieldWell.svelte", parts: ["field-well.css"] },
  shape: "radius", states: ["default"], approval: "required", contract: FieldWellContract,
} as const);
