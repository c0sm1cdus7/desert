// PublicCatalogBankSpecimen: one resolved node of the bank, interactive with local diagnostic state only; it passes
// catalog navigation on and never calls a product controller or command.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PublicCatalogBankSpecimenContract } from "./public-catalog-bank-specimen.contract.ts";

export const PublicCatalogBankSpecimen = defineComposition({
  id: "public-catalog-bank-specimen",
  purpose: { key: "publicCatalogBankSpecimen.purpose" },
  messages: ["publicCatalogBankSpecimen.purpose", "publicCatalogBankSpecimen.writing", "publicCatalogBankSpecimen.pressed",
    "publicCatalogBankSpecimen.open"],
  owner: { entry: "PublicCatalogBankSpecimen.svelte", parts: ["catalog-specimen.svelte.ts"] },
  uses: ["node-renderer", "text"], approval: "none", contract: PublicCatalogBankSpecimenContract,
} as const);
