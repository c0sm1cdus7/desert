// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AttentionStatusContract } from "./attention-status.contract.ts";

export const AttentionStatus = defineComposition({
  id: "attention-status",
  purpose: "Pair the shared attention indicator with readable context for the attention signal.",
  owner: { entry: "AttentionStatus.svelte" },
  uses: ["attention-indicator", "grouped-panel"], approval: "none", contract: AttentionStatusContract,
} as const);
