// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AppearanceContract } from "./appearance.contract.ts";

export const Appearance = defineComposition({
  id: "appearance",
  purpose: "Declared as found at the start of the migration: Appearance.svelte.",
  owner: { entry: "Appearance.svelte" },
  uses: ["appearance-preferences", "feedback"], approval: "none", contract: AppearanceContract,
} as const);
