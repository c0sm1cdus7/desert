// AttentionList: the Home list of every object or activity that needs the identity's attention, with its loading,
// empty and failure states.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AttentionListContract } from "./attention-list.contract.ts";

export const AttentionList = defineComposition({
  id: "attention-list",
  purpose: "Bring every object or activity needing the identity’s attention into one consistent Home list.",
  owner: { entry: "AttentionList.svelte" },
  uses: ["attention-indicator", "collection-state", "feedback", "grouped-panel", "icon", "stack-layout"], approval: "required", contract: AttentionListContract,
} as const);
