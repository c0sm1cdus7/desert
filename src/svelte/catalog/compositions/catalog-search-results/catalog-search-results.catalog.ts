// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogSearchResultsContract } from "./catalog-search-results.contract.ts";

export const CatalogSearchResults = defineComposition({
  id: "catalog-search-results",
  purpose: "Declared as found at the start of the migration: CatalogSearchResults.svelte.",
  owner: { entry: "CatalogSearchResults.svelte" },
  uses: ["bank-renderer", "grouped-panel"], approval: "none", contract: CatalogSearchResultsContract,
} as const);
