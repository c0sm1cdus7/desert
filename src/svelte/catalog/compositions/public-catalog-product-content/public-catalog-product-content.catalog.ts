// PublicCatalogProductContent: the public catalog product: browse, exercises and component bank in one workspace, with
// search, detail return and browser history.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PublicCatalogProductContentContract } from "./public-catalog-product-content.contract.ts";

export const PublicCatalogProductContent = defineComposition({
  id: "public-catalog-product-content",
  purpose: { key: "publicCatalogProductContent.purpose" },
  messages: ["publicCatalogProductContent.purpose", "publicCatalogProductContent.documentTitle", "publicCatalogProductContent.bank",
    "publicCatalogProductContent.bankSubtitle"],
  owner: { entry: "PublicCatalogProductContent.svelte", parts: ["catalog-history.ts"] },
  uses: ["appearance-root", "catalog-workspace"], approval: "none", contract: PublicCatalogProductContentContract,
} as const);
