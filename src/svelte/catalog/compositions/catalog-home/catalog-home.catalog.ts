// CatalogHome: the overview of a catalog; a featured entry above rails of items, each drawn by the node renderer.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogHomeContract } from "./catalog-home.contract.ts";

export const CatalogHome = defineComposition({
  id: "catalog-home",
  purpose: { key: "catalogHome.purpose" },
  messages: ["catalogHome.purpose"],
  owner: { entry: "CatalogHome.svelte" },
  uses: ["column", "heading", "inline", "node-renderer", "stack-item", "view-region"], renders: ["catalog.home"],
  approval: "none", contract: CatalogHomeContract,
} as const);
