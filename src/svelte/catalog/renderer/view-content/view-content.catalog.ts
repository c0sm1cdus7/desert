// ViewContent: one resolved view drawn as a content flow, with the bank and library actions the workspace calls.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewContentContract } from "./view-content.contract.ts";

export const ViewContent = defineComposition({
  id: "view-content",
  purpose: { key: "viewContent.purpose" },
  messages: ["viewContent.purpose"],
  owner: { entry: "ViewContent.svelte" },
  uses: ["content-flow"], approval: "none", contract: ViewContentContract,
} as const);
