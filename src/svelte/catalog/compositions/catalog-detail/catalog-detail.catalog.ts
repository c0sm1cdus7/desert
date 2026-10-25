// CatalogDetail: one catalog item read in place, its photographs, its title and its description.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogDetailContract } from "./catalog-detail.contract.ts";

export const CatalogDetail = defineComposition({
  id: "catalog-detail",
  purpose: { key: "catalogDetail.purpose" },
  messages: ["catalogDetail.purpose", "catalogDetail.about"],
  owner: { entry: "CatalogDetail.svelte" },
  uses: ["column", "gallery", "heading", "stack-item", "stack-layout", "text", "view-region"], renders: ["catalog.detail"],
  approval: "none", contract: CatalogDetailContract,
} as const);
