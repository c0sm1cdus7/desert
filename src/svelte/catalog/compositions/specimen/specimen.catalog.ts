// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenContract } from "./specimen.contract.ts";

export const Specimen = defineComposition({
  id: "specimen",
  purpose: "Declared as found at the start of the migration: Specimen.svelte.",
  owner: { entry: "Specimen.svelte", parts: ["specimen-presentation.ts"] },
  uses: ["node-renderer", "surface-frame"], approval: "none", contract: SpecimenContract,
} as const);
