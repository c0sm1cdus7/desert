// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FactGroupContract } from "./fact-group.contract.ts";

export const FactGroup = defineComposition({
  id: "fact-group",
  purpose: "Declared as found at the start of the migration: FactGroup.svelte.",
  owner: { entry: "FactGroup.svelte" },
  uses: ["fact-row", "node-renderer"], approval: "none", contract: FactGroupContract,
} as const);
