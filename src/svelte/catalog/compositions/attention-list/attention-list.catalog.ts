// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AttentionListContract } from "./attention-list.contract.ts";

export const AttentionList = defineComposition({
  id: "attention-list",
  purpose: "Bring every object or activity needing the identity\u2019s attention into one consistent Home list.",
  owner: { entry: "AttentionList.svelte" },
  uses: ["attention-indicator", "collection-state", "feedback", "grouped-panel", "stack-layout"], approval: "required", contract: AttentionListContract,
} as const);
