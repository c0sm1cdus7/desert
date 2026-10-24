// ContentFlow: the vertical flow of a resolved view's content. Its contract stays a stub: the instance methods it exposes
// (revealEntry, revealAndFocusEntry) return a Promise of an HTMLElement, which the contract subset cannot express.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContentFlowContract } from "./content-flow.contract.ts";

export const ContentFlow = defineComposition({
  id: "content-flow",
  purpose: "Arrange reading, overview or gallery stacks within the shared content measures and responsive layout.",
  owner: { entry: "ContentFlow.svelte" },
  uses: ["appearance", "feedback", "identity", "information", "inspection-content", "media-content", "place-heading", "stack-layout", "view-attention", "view-item", "view-related-selection", "view-region"], approval: "none", contract: ContentFlowContract,
} as const);
