// ViewAttention: the attention block of a view, the identity's pending items as a list that resumes one as a node event.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewAttentionContract } from "./view-attention.contract.ts";

export const ViewAttention = defineComposition({
  id: "view-attention",
  purpose: "Show the work that needs attention in a view and resume one item from it.",
  owner: { entry: "ViewAttention.svelte" },
  uses: ["attention-list"], approval: "none", contract: ViewAttentionContract,
} as const);
