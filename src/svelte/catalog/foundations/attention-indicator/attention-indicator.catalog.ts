// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { AttentionIndicatorContract } from "./attention-indicator.contract.ts";

export const AttentionIndicator = defineFoundation({
  id: "attention-indicator",
  purpose: "Mark objects needing attention with the same amber indicator everywhere, steady when reduced motion is enabled.",
  owner: { entry: "AttentionIndicator.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: AttentionIndicatorContract,
} as const);
