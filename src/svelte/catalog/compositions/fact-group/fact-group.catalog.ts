// FactGroup: the facts of one object: its image fields as images, the rest as labelled rows of one pane.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FactGroupContract } from "./fact-group.contract.ts";

export const FactGroup = defineComposition({
  id: "fact-group",
  purpose: { key: "factGroup.purpose" },
  messages: ["factGroup.purpose"],
  owner: { entry: "FactGroup.svelte" },
  uses: ["fact-row", "list", "node-renderer"], approval: "none", contract: FactGroupContract,
} as const);
