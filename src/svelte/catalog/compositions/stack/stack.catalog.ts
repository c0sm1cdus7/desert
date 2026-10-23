// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { StackContract } from "./stack.contract.ts";

export const Stack = defineComposition({
  id: "stack",
  purpose: "Declared as found at the start of the migration: Stack.svelte.",
  owner: { entry: "Stack.svelte" },
  uses: ["node-renderer", "stack-item", "stack-layout"], approval: "none", contract: StackContract,
} as const);
