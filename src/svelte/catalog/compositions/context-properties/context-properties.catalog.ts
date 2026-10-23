// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContextPropertiesContract } from "./context-properties.contract.ts";

export const ContextProperties = defineComposition({
  id: "context-properties",
  purpose: "Read related facts and use state commands in one shared pane, separate from reading paragraphs.",
  owner: { entry: "ContextProperties.svelte" },
  uses: ["fact-row", "object-state-row", "stack-layout"], approval: "none", contract: ContextPropertiesContract,
} as const);
