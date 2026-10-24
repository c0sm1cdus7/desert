// FactGroup: the facts of one object: its image fields as images, the rest as labelled rows of one pane.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FactGroupContract } from "./fact-group.contract.ts";

export const FactGroup = defineComposition({
  id: "fact-group",
  purpose: "Show the facts of one object: image fields as images and every other field as a labelled row.",
  owner: { entry: "FactGroup.svelte" },
  uses: ["fact-row", "node-renderer"], approval: "none", contract: FactGroupContract,
} as const);
