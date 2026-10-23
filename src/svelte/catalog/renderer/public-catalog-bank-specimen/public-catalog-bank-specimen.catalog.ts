// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PublicCatalogBankSpecimenContract } from "./public-catalog-bank-specimen.contract.ts";

export const PublicCatalogBankSpecimen = defineComposition({
  id: "public-catalog-bank-specimen",
  purpose: "Declared as found at the start of the migration: PublicCatalogBankSpecimen.svelte.",
  owner: { entry: "PublicCatalogBankSpecimen.svelte", parts: ["catalog-specimen.svelte.ts"] },
  uses: [], approval: "none", contract: PublicCatalogBankSpecimenContract,
} as const);
