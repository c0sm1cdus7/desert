// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PublicCatalogProductContract } from "./public-catalog-product.contract.ts";

export const PublicCatalogProduct = defineComposition({
  id: "public-catalog-product",
  purpose: "Declared as found at the start of the migration: PublicCatalogProduct.svelte.",
  owner: { entry: "PublicCatalogProduct.svelte" },
  uses: [], approval: "none", contract: PublicCatalogProductContract,
} as const);
