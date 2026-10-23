// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewAttentionContract } from "./view-attention.contract.ts";

export const ViewAttention = defineComposition({
  id: "view-attention",
  purpose: "Declared as found at the start of the migration: ViewAttention.svelte.",
  owner: { entry: "ViewAttention.svelte" },
  uses: ["attention-list"], approval: "none", contract: ViewAttentionContract,
} as const);
