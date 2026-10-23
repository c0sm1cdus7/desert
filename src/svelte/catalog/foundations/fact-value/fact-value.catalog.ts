// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FactValueContract } from "./fact-value.contract.ts";

export const FactValue = defineFoundation({
  id: "fact-value",
  purpose: "Declared as found at the start of the migration: FactValue.svelte.",
  owner: { entry: "FactValue.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: FactValueContract,
} as const);
