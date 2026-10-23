// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { RetainedPlaceContract } from "./retained-place.contract.ts";

export const RetainedPlace = defineComposition({
  id: "retained-place",
  purpose: "Declared as found at the start of the migration: RetainedPlace.svelte.",
  owner: { entry: "RetainedPlace.svelte" },
  uses: [], approval: "none", contract: RetainedPlaceContract,
} as const);
