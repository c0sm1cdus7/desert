// PlaceHeading: the semantic heading of a place: its title, subtitle and optional featured image, gallery or video.
// Its contract stays a stub: `element` is a $bindable HTMLElement and `identity` is typed in src/svelte/infra (migration debt).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PlaceHeadingContract } from "./place-heading.contract.ts";

export const PlaceHeading = defineComposition({
  id: "place-heading",
  purpose: "Head a place with its title, subtitle and optional featured image, gallery or video.",
  owner: { entry: "PlaceHeading.svelte", parts: ["place-heading.css"] },
  uses: ["heading", "photo-collection"], approval: "none", contract: PlaceHeadingContract,
} as const);
