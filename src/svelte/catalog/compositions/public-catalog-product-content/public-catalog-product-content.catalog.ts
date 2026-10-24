// PublicCatalogProductContent: the public catalog product: browse, exercises and component bank in one workspace, with
// search, detail return and browser history.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PublicCatalogProductContentContract } from "./public-catalog-product-content.contract.ts";

export const PublicCatalogProductContent = defineComposition({
  id: "public-catalog-product-content",
  purpose: "Browse a published catalog, its exercises and its component bank, with search and browser history that return to where the person was.",
  owner: { entry: "PublicCatalogProductContent.svelte", parts: ["catalog-history.ts"] },
  uses: ["catalog-workspace"], approval: "none", contract: PublicCatalogProductContentContract,
} as const);
