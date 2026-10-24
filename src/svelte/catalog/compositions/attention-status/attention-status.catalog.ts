// AttentionStatus: a grouped panel that says how many pending activities need the person's attention.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AttentionStatusContract } from "./attention-status.contract.ts";

export const AttentionStatus = defineComposition({
  id: "attention-status",
  purpose: { key: "attentionStatus.purpose" },
  messages: ["attentionStatus.purpose", "attentionStatus.one", "attentionStatus.many"],
  owner: { entry: "AttentionStatus.svelte" },
  uses: ["list", "row"], approval: "none", contract: AttentionStatusContract,
} as const);
