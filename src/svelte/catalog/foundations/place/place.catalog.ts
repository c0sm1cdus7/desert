// Place: the scroll owner of a navigation or content place: its top toolbar, scrolling content, bottom toolbar and
// overlay, with focus revealed clear of the toolbars and the scroll edges drawn over it. Its contract stays a stub.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { PlaceContract } from "./place.contract.ts";

export const Place = defineFoundation({
  id: "place",
  purpose: "Arrange content and top or bottom toolbars, with lateral surfaces only at the root. Mounted surfaces keep their own content and toolbars.",
  owner: { entry: "Place.svelte", parts: ["place.css"], mechanisms: ["toolbar-scroll"] },
  shape: "none", states: ["default", "searching"], approval: "required", contract: PlaceContract,
} as const);
