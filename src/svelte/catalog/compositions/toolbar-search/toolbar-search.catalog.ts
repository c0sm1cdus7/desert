// ToolbarSearch: the search field and search toggle of a toolbar, expanded while searching.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ToolbarSearchContract } from "./toolbar-search.contract.ts";

export const ToolbarSearch = defineComposition({
  id: "toolbar-search",
  purpose: "Search the items of a toolbar's place: a search field revealed by a toggle that also closes the search.",
  owner: { entry: "ToolbarSearch.svelte" },
  uses: ["search-field"], approval: "none", contract: ToolbarSearchContract,
} as const);
