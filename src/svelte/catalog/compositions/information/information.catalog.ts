// Information: an ordered block of reading paragraphs and labelled facts; consecutive facts share one fact list.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InformationContract } from "./information.contract.ts";

export const Information = defineComposition({
  id: "information",
  purpose: "Group related facts in one pane while leaving reading paragraphs in the content stack.",
  owner: { entry: "Information.svelte" },
  uses: ["column", "fact-list", "fact-row", "text"], approval: "none", contract: InformationContract,
} as const);
