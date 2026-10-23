// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { StackLayoutContract } from "./stack-layout.contract.ts";

export const StackLayout = defineFoundation({
  id: "stack-layout",
  purpose: "Declared as found at the start of the migration: StackLayout.svelte.",
  owner: { entry: "StackLayout.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: StackLayoutContract,
} as const);
