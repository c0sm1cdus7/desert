// CatalogHome: the overview of a catalog; a featured entry above rails of items, each drawn by the node renderer.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogHomeContract } from "./catalog-home.contract.ts";

export const CatalogHome = defineComposition({
  id: "catalog-home",
  purpose: "Arrange a catalog overview from the same content, media and navigation compositions.",
  owner: { entry: "CatalogHome.svelte" },
  uses: ["heading", "node-renderer"], approval: "none", contract: CatalogHomeContract,
} as const);
