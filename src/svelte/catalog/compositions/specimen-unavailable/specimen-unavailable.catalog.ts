// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenUnavailableContract } from "./specimen-unavailable.contract.ts";

export const SpecimenUnavailable = defineComposition({
  id: "specimen-unavailable",
  purpose: "Declared as found at the start of the migration: SpecimenUnavailable.svelte.",
  owner: { entry: "SpecimenUnavailable.svelte" },
  uses: [], approval: "none", contract: SpecimenUnavailableContract,
} as const);
