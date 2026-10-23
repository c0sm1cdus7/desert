// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PublicCatalogProductContentContract } from "./public-catalog-product-content.contract.ts";

export const PublicCatalogProductContent = defineComposition({
  id: "public-catalog-product-content",
  purpose: "Declared as found at the start of the migration: PublicCatalogProductContent.svelte.",
  owner: { entry: "PublicCatalogProductContent.svelte", parts: ["catalog-history.ts"] },
  uses: ["catalog-workspace"], approval: "none", contract: PublicCatalogProductContentContract,
} as const);
