// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogNavigationContract } from "./catalog-navigation.contract.ts";

export const CatalogNavigation = defineComposition({
  id: "catalog-navigation",
  purpose: "Declared as found at the start of the migration: CatalogNavigation.svelte.",
  owner: { entry: "CatalogNavigation.svelte" },
  uses: ["place", "toolbar-layout"], approval: "none", contract: CatalogNavigationContract,
} as const);
