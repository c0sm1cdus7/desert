// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FactRowContract } from "./fact-row.contract.ts";

export const FactRow = defineFoundation({
  id: "fact-row",
  purpose: "Keep a capitalized label on the left and its value right-aligned, with shared horizontal dividers and balanced wrapping.",
  owner: { entry: "FactRow.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: FactRowContract,
} as const);
