// AttentionStatus: a grouped panel that says how many pending activities need the person's attention.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AttentionStatusContract } from "./attention-status.contract.ts";

export const AttentionStatus = defineComposition({
  id: "attention-status",
  purpose: "Pair the shared attention indicator with readable context for the attention signal.",
  owner: { entry: "AttentionStatus.svelte" },
  uses: ["attention-indicator", "grouped-panel"], approval: "none", contract: AttentionStatusContract,
} as const);
