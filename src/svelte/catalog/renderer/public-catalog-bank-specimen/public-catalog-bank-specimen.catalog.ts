// PublicCatalogBankSpecimen: one resolved node of the bank, interactive with local diagnostic state only; it passes
// catalog navigation on and never calls a product controller or command.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PublicCatalogBankSpecimenContract } from "./public-catalog-bank-specimen.contract.ts";

export const PublicCatalogBankSpecimen = defineComposition({
  id: "public-catalog-bank-specimen",
  purpose: "Render one bank node with local diagnostic interaction, an opener for dialogs, and a notice instead of product effects.",
  owner: { entry: "PublicCatalogBankSpecimen.svelte", parts: ["catalog-specimen.svelte.ts"] },
  uses: ["feedback", "node-renderer"], approval: "none", contract: PublicCatalogBankSpecimenContract,
} as const);
