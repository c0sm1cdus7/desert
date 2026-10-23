// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewItemContract } from "./view-item.contract.ts";

export const ViewItem = defineComposition({
  id: "view-item",
  purpose: "Declared as found at the start of the migration: ViewItem.svelte.",
  owner: { entry: "ViewItem.svelte" },
  uses: [], approval: "none", contract: ViewItemContract,
} as const);
