// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { CatalogCardContract } from "./catalog-card.contract.ts";

export const CatalogCard = defineFoundation({
  id: "catalog-card",
  purpose: "Open a media item from a card composed of artwork and its supporting content.",
  owner: { entry: "CatalogCard.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: CatalogCardContract,
} as const);
