// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PlaceHeaderContract } from "./place-header.contract.ts";

export const PlaceHeader = defineComposition({
  id: "place-header",
  purpose: "Declared as found at the start of the migration: PlaceHeader.svelte.",
  owner: { entry: "PlaceHeader.svelte" },
  uses: ["heading"], approval: "none", contract: PlaceHeaderContract,
} as const);
