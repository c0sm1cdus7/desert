// CatalogSearchResults: what a search in one destination found, as record cards or result rows, and the choice of one.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogSearchResultsContract } from "./catalog-search-results.contract.ts";

export const CatalogSearchResults = defineComposition({
  id: "catalog-search-results",
  purpose: { key: "catalogSearchResults.purpose" },
  messages: ["catalogSearchResults.purpose", "catalogSearchResults.prompt", "catalogSearchResults.heading", "catalogSearchResults.one",
    "catalogSearchResults.many", "catalogSearchResults.empty", "catalogSearchResults.another"],
  owner: { entry: "CatalogSearchResults.svelte" },
  uses: ["column", "grid", "heading", "list", "node-renderer", "row", "status", "text"], approval: "none", contract: CatalogSearchResultsContract,
} as const);
