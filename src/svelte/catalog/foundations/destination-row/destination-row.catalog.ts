// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { DestinationRowContract } from "./destination-row.contract.ts";

export const DestinationRow = defineFoundation({
  id: "destination-row",
  purpose: "Declared as found at the start of the migration: DestinationRow.svelte.",
  owner: { entry: "DestinationRow.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: DestinationRowContract,
} as const);
