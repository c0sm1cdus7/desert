// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SearchFieldContract } from "./search-field.contract.ts";

export const SearchField = defineFoundation({
  id: "search-field",
  purpose: "Declared as found at the start of the migration: SearchField.svelte.",
  owner: { entry: "SearchField.svelte", parts: ["search-field.css"] },
  shape: "capsule", states: ["default"], approval: "required", contract: SearchFieldContract,
} as const);
