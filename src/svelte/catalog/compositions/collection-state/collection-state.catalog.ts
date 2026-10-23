// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CollectionStateContract } from "./collection-state.contract.ts";

export const CollectionState = defineComposition({
  id: "collection-state",
  purpose: "Declared as found at the start of the migration: CollectionState.svelte.",
  owner: { entry: "CollectionState.svelte" },
  uses: ["grouped-panel"], approval: "none", contract: CollectionStateContract,
} as const);
