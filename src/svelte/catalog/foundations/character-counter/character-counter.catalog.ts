// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { CharacterCounterContract } from "./character-counter.contract.ts";

export const CharacterCounter = defineFoundation({
  id: "character-counter",
  purpose: "Declared as found at the start of the migration: CharacterCounter.svelte.",
  owner: { entry: "CharacterCounter.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: CharacterCounterContract,
} as const);
