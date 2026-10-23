// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaReferenceSpecimenContract } from "./media-reference-specimen.contract.ts";

export const MediaReferenceSpecimen = defineComposition({
  id: "media-reference-specimen",
  purpose: "Declared as found at the start of the migration: MediaReferenceSpecimen.svelte.",
  owner: { entry: "MediaReferenceSpecimen.svelte" },
  uses: ["media-reference-selector"], approval: "none", contract: MediaReferenceSpecimenContract,
} as const);
