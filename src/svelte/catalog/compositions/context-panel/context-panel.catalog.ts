// ContextPanel: an object read in place, with its attention, media, prose, images, properties and contextual actions.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContextPanelContract } from "./context-panel.contract.ts";

export const ContextPanel = defineComposition({
  id: "context-panel",
  purpose: { key: "contextPanel.purpose" },
  messages: ["contextPanel.purpose", "contextPanel.actions"],
  owner: { entry: "ContextPanel.svelte" },
  uses: ["attention-status", "column", "context-properties", "list", "media-object", "node-renderer", "reading-content", "row", "spacer", "stack-layout"], renders: ["context"], approval: "none", contract: ContextPanelContract,
} as const);
