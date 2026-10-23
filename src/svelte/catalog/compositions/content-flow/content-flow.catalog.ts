// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContentFlowContract } from "./content-flow.contract.ts";

export const ContentFlow = defineComposition({
  id: "content-flow",
  purpose: "Arrange reading, overview or gallery stacks within the shared content measures and responsive layout.",
  owner: { entry: "ContentFlow.svelte" },
  uses: ["appearance", "feedback", "identity", "information", "inspection-content", "media-content", "place-heading", "stack-layout", "view-attention", "view-item", "view-related-selection"], approval: "none", contract: ContentFlowContract,
} as const);
