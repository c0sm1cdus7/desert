// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InspectionContentContract } from "./inspection-content.contract.ts";

export const InspectionContent = defineComposition({
  id: "inspection-content",
  purpose: "Declared as found at the start of the migration: InspectionContent.svelte.",
  owner: { entry: "InspectionContent.svelte" },
  uses: ["inspection"], approval: "none", contract: InspectionContentContract,
} as const);
