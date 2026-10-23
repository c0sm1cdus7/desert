// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenRowContract } from "./specimen-row.contract.ts";

export const SpecimenRow = defineComposition({
  id: "specimen-row",
  purpose: "Declared as found at the start of the migration: SpecimenRow.svelte.",
  owner: { entry: "SpecimenRow.svelte" },
  uses: ["stack-item"], approval: "none", contract: SpecimenRowContract,
} as const);
