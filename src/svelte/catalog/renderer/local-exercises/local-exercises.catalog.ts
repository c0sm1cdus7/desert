// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LocalExercisesContract } from "./local-exercises.contract.ts";

export const LocalExercises = defineComposition({
  id: "local-exercises",
  purpose: "Declared as found at the start of the migration: LocalExercises.svelte.",
  owner: { entry: "LocalExercises.svelte" },
  uses: [], approval: "none", contract: LocalExercisesContract,
} as const);
