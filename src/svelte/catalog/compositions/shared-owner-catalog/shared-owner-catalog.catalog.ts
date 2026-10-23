// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SharedOwnerCatalogContract } from "./shared-owner-catalog.contract.ts";

export const SharedOwnerCatalog = defineComposition({
  id: "shared-owner-catalog",
  purpose: "Declared as found at the start of the migration: SharedOwnerCatalog.svelte.",
  owner: { entry: "SharedOwnerCatalog.svelte" },
  uses: ["destination-row", "grouped-panel", "information", "place-header", "shared-owner-specimen", "stack-layout", "toolbar-layout"], approval: "none", contract: SharedOwnerCatalogContract,
} as const);
