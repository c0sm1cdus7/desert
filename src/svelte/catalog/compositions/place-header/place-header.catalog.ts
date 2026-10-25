// PlaceHeader: the heading embedded in a place's content: title, subtitle and an optional background image.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PlaceHeaderContract } from "./place-header.contract.ts";

export const PlaceHeader = defineComposition({
  id: "place-header",
  purpose: { key: "placeHeader.purpose" },
  messages: ["placeHeader.purpose"],
  owner: { entry: "PlaceHeader.svelte" },
  uses: ["place-heading"], approval: "none", contract: PlaceHeaderContract,
} as const);
