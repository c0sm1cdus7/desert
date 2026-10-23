// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogDetailContract } from "./catalog-detail.contract.ts";

export const CatalogDetail = defineComposition({
  id: "catalog-detail",
  purpose: "Read one catalog item with its media and details in the current destination.",
  owner: { entry: "CatalogDetail.svelte" },
  uses: ["heading", "photo-collection", "stack-layout"], approval: "none", contract: CatalogDetailContract,
} as const);
