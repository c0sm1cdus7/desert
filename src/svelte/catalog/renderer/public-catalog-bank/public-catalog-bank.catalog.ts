// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PublicCatalogBankContract } from "./public-catalog-bank.contract.ts";

export const PublicCatalogBank = defineComposition({
  id: "public-catalog-bank",
  purpose: "Declared as found at the start of the migration: PublicCatalogBank.svelte.",
  owner: { entry: "PublicCatalogBank.svelte" },
  uses: [], approval: "none", contract: PublicCatalogBankContract,
} as const);
