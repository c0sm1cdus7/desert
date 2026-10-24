// Information: an ordered block of reading paragraphs and labelled facts; consecutive facts share one fact list.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InformationContract } from "./information.contract.ts";

export const Information = defineComposition({
  id: "information",
  purpose: { key: "information.purpose" },
  messages: ["information.purpose"],
  owner: { entry: "Information.svelte" },
  uses: ["column", "fact-row", "list", "text"], approval: "none", contract: InformationContract,
} as const);
