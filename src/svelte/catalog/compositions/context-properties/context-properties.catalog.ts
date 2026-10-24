// ContextProperties: the properties pane of an object's context, its facts as label/value rows and its state selectors,
// separate from the reading paragraphs.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContextPropertiesContract } from "./context-properties.contract.ts";

export const ContextProperties = defineComposition({
  id: "context-properties",
  purpose: "Read related facts and use state commands in one shared pane, separate from reading paragraphs.",
  owner: { entry: "ContextProperties.svelte" },
  uses: ["fact-row", "object-state-row", "stack-layout"], approval: "none", contract: ContextPropertiesContract,
} as const);
