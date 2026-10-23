// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LocalExerciseContentContract } from "./local-exercise-content.contract.ts";

export const LocalExerciseContent = defineComposition({
  id: "local-exercise-content",
  purpose: "Declared as found at the start of the migration: LocalExerciseContent.svelte.",
  owner: { entry: "LocalExerciseContent.svelte" },
  uses: ["place-content"], approval: "none", contract: LocalExerciseContentContract,
} as const);
