// PublicCatalogProduct: the root of the built public catalog page.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PublicCatalogProductContract } from "./public-catalog-product.contract.ts";

export const PublicCatalogProduct = defineComposition({
  id: "public-catalog-product",
  purpose: "Mount the public catalog product content for the built public catalog page.",
  owner: { entry: "PublicCatalogProduct.svelte" },
  uses: ["public-catalog-product-content"], approval: "none", contract: PublicCatalogProductContract,
} as const);
