// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewProductContract } from "./view-product.contract.ts";

export const ViewProduct = defineComposition({
  id: "view-product",
  purpose: "Declared as found at the start of the migration: ViewProduct.svelte.",
  owner: { entry: "ViewProduct.svelte" },
  uses: ["view-product-content"], approval: "none", contract: ViewProductContract,
} as const);
