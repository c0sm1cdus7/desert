// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SurfaceSpecimenContract } from "./surface-specimen.contract.ts";

export const SurfaceSpecimen = defineComposition({
  id: "surface-specimen",
  purpose: "Declared as found at the start of the migration: SurfaceSpecimen.svelte.",
  owner: { entry: "SurfaceSpecimen.svelte" },
  uses: ["drawer", "information", "stack-layout", "surface-frame"], approval: "none", contract: SurfaceSpecimenContract,
} as const);
