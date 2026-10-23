// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { UtilityActionsContract } from "./utility-actions.contract.ts";

export const UtilityActions = defineComposition({
  id: "utility-actions",
  purpose: "Declared as found at the start of the migration: UtilityActions.svelte.",
  owner: { entry: "UtilityActions.svelte" },
  uses: ["node-renderer"], approval: "none", contract: UtilityActionsContract,
} as const);
