// ContentFlow: the vertical flow of a resolved view's content in its view region: the offline notice, stacks of items,
// the bank, the media library, appearance, identity, attention and, in a panel, its heading media and related selections.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContentFlowContract } from "./content-flow.contract.ts";

export const ContentFlow = defineComposition({
  id: "content-flow",
  purpose: { key: "contentFlow.purpose" },
  messages: ["contentFlow.purpose", "contentFlow.connection", "contentFlow.offline"],
  owner: { entry: "ContentFlow.svelte" },
  uses: ["appearance", "column", "identity", "information", "inspection-content", "media-content", "place-heading", "stack-layout", "text",
    "view-attention", "view-item", "view-region", "view-related-selection"], approval: "none", contract: ContentFlowContract,
} as const);
