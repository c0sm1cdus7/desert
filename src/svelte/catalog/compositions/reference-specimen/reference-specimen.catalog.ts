// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReferenceSpecimenContract } from "./reference-specimen.contract.ts";

export const ReferenceSpecimen = defineComposition({
  id: "reference-specimen",
  purpose: "Declared as found at the start of the migration: ReferenceSpecimen.svelte.",
  owner: { entry: "ReferenceSpecimen.svelte" },
  uses: ["color-bullet", "label-rail", "labels-control", "reference-selector", "reference-values"], approval: "none", contract: ReferenceSpecimenContract,
} as const);
