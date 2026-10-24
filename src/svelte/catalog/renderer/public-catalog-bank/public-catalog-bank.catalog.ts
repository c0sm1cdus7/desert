// PublicCatalogBank: the component bank inside the workspace, which registers how the workspace reveals one of its entries.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PublicCatalogBankContract } from "./public-catalog-bank.contract.ts";

export const PublicCatalogBank = defineComposition({
  id: "public-catalog-bank",
  purpose: { key: "publicCatalogBank.purpose" },
  messages: ["publicCatalogBank.purpose"],
  owner: { entry: "PublicCatalogBank.svelte" },
  uses: ["inspection-catalog"], approval: "none", contract: PublicCatalogBankContract,
} as const);
