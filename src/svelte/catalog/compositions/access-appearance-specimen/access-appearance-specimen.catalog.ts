// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessAppearanceSpecimenContract } from "./access-appearance-specimen.contract.ts";

export const AccessAppearanceSpecimen = defineComposition({
  id: "access-appearance-specimen",
  purpose: "Declared as found at the start of the migration: AccessAppearanceSpecimen.svelte.",
  owner: { entry: "AccessAppearanceSpecimen.svelte" },
  uses: ["access-experience", "appearance-preferences", "appearance-preview", "avatar-shuffle", "feedback", "lock-screen", "seed-avatar", "wallpaper"], approval: "none", contract: AccessAppearanceSpecimenContract,
} as const);
