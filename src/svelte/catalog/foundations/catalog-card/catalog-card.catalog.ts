// CatalogCard: one media item of the public catalog as a card, its image (or the placeholder of its media kind) under
// a title that opens the item.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { CatalogCardContract } from "./catalog-card.contract.ts";

export const CatalogCard = defineFoundation({
  id: "catalog-card",
  purpose: "Open a media item from a card composed of artwork and its supporting content.",
  owner: { entry: "CatalogCard.svelte" },
  shape: "none", states: ["image", "placeholder"], renders: ["catalog.card"], approval: "required", contract: CatalogCardContract,
} as const);
