// CatalogNavigation: retired. The shell draws the navigation pane from data (DESIGN §4 item 77); this declaration stays
// only until Batch 3 prunes the folder with its ledger entry.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogNavigationContract } from "./catalog-navigation.contract.ts";

export const CatalogNavigation = defineComposition({
  id: "catalog-navigation",
  purpose: { key: "catalogNavigation.purpose" },
  messages: ["catalogNavigation.purpose"],
  owner: { entry: "CatalogNavigation.svelte" },
  uses: [], approval: "none", contract: CatalogNavigationContract,
} as const);
