// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenGroupContract } from "./specimen-group.contract.ts";

export const SpecimenGroup = defineComposition({
  id: "specimen-group",
  purpose: "Declared as found at the start of the migration: SpecimenGroup.svelte.",
  owner: { entry: "SpecimenGroup.svelte" },
  uses: ["contract-inspection", "feedback", "measured-field", "selection-field", "stack-layout"], approval: "none", contract: SpecimenGroupContract,
} as const);
