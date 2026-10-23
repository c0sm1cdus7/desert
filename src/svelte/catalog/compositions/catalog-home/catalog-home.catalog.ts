// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogHomeContract } from "./catalog-home.contract.ts";

export const CatalogHome = defineComposition({
  id: "catalog-home",
  purpose: "Arrange a catalog overview from the same content, media and navigation compositions.",
  owner: { entry: "CatalogHome.svelte" },
  uses: ["bank-renderer", "heading"], approval: "none", contract: CatalogHomeContract,
} as const);
