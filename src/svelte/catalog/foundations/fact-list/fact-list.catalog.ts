// Fact list: one pane holding a description list of fact rows (label and value).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FactListContract } from "./fact-list.contract.ts";

export const FactList = defineFoundation({
  id: "fact-list",
  purpose: "One pane holding fact rows as a description list.",
  owner: { entry: "FactList.svelte" },
  shape: "radius", states: ["default"],
  slots: { children: { accepts: ["fact-row"] } },
  approval: "required", contract: FactListContract,
} as const);
