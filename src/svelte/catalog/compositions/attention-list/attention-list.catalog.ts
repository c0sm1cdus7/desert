// AttentionList: the Home list of every object or activity that needs the identity's attention, with its loading,
// empty and failure states.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AttentionListContract } from "./attention-list.contract.ts";

export const AttentionList = defineComposition({
  id: "attention-list",
  purpose: { key: "attentionList.purpose" },
  messages: ["attentionList.purpose", "attentionList.title", "attentionList.emptyTitle", "attentionList.emptyDescription"],
  owner: { entry: "AttentionList.svelte" },
  uses: ["collection-state", "list", "row", "stack-layout", "status", "text"], approval: "required", contract: AttentionListContract,
} as const);
