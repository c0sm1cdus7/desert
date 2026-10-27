// CatalogCard: a resolved catalog card node (a featured entry or an item of a rail) drawn as a Card: its image, or the
// placeholder of its media kind, under the title that opens it. It answers to `catalog-return:<record>` in the nearest
// focus scope, so the detail it opens can return focus to it.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogCardContract } from "./catalog-card.contract.ts";

export const CatalogCard = defineComposition({
  id: "catalog-card",
  purpose: { key: "catalogCard.purpose" },
  messages: ["catalogCard.purpose"],
  owner: { entry: "CatalogCard.svelte" },
  uses: ["card"], renders: ["catalog.card"], approval: "none", contract: CatalogCardContract,
} as const);
