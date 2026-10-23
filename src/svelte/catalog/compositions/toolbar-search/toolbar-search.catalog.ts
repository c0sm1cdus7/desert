// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ToolbarSearchContract } from "./toolbar-search.contract.ts";

export const ToolbarSearch = defineComposition({
  id: "toolbar-search",
  purpose: "Declared as found at the start of the migration: ToolbarSearch.svelte.",
  owner: { entry: "ToolbarSearch.svelte" },
  uses: ["search-field"], approval: "none", contract: ToolbarSearchContract,
} as const);
