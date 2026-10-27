// PlaceHeading: the semantic heading of a place (its focusable page title, subtitle and optional featured image,
// gallery or video, docked into the toolbar by the shell) or of content embedded in a place (title, subtitle and an
// optional background image). It absorbs the place-header composition.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { PlaceHeadingContract } from "./place-heading.contract.ts";

export const PlaceHeading = defineFoundation({
  id: "place-heading",
  purpose: { key: "placeHeading.purpose" }, messages: ["placeHeading.purpose"],
  owner: { entry: "PlaceHeading.svelte", parts: ["place-heading.css"] },
  shape: "none", states: ["default", "media"],
  variants: { context: ["place", "embedded"] },
  approval: "required", contract: PlaceHeadingContract,
} as const);
