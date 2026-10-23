// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { PlaceContract } from "./place.contract.ts";

export const Place = defineFoundation({
  id: "place",
  purpose: "Arrange content and top or bottom toolbars, with lateral surfaces only at the root. Mounted surfaces keep their own content and toolbars.",
  owner: { entry: "Place.svelte", parts: ["place-focus.ts", "place.css"], vendor: ["sidebar", "tooltip"] },
  shape: "none", states: ["default"], approval: "required", contract: PlaceContract,
} as const);
