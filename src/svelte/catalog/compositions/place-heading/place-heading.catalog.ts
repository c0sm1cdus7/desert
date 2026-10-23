// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PlaceHeadingContract } from "./place-heading.contract.ts";

export const PlaceHeading = defineComposition({
  id: "place-heading",
  purpose: "Declared as found at the start of the migration: PlaceHeading.svelte.",
  owner: { entry: "PlaceHeading.svelte", parts: ["place-heading.css"] },
  uses: ["heading", "photo-collection"], approval: "none", contract: PlaceHeadingContract,
} as const);
