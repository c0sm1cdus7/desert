// Card: one pressable card that opens a catalog item, a media item, a collection or the collection a summary reads. It
// is catalog-card generalised, and it absorbs the media tile, the collection cover and the summary widget's card.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { CardContract } from "./card.contract.ts";

export const Card = defineFoundation({
  id: "card",
  purpose: "Open one item, media, collection or summary from a card composed of artwork and its supporting content.",
  owner: { entry: "Card.svelte" },
  shape: "radius", states: ["default", "current", "disabled"],
  variants: { presentation: ["featured", "item", "tile", "collection", "summary"] },
  slots: { children: { accepts: ["heading", "text", "meter", "loading", "inline"] } },
  approval: "required", contract: CardContract,
} as const);
