// PlaceHeader: the heading embedded in a place's content: title, subtitle and an optional background image.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PlaceHeaderContract } from "./place-header.contract.ts";

export const PlaceHeader = defineComposition({
  id: "place-header",
  purpose: "Head a place's content with its title, its subtitle and an optional background image, never a toolbar.",
  owner: { entry: "PlaceHeader.svelte" },
  uses: ["heading"], approval: "none", contract: PlaceHeaderContract,
} as const);
