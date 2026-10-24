// ContextPanel: an object read in place, with its attention, media, prose, images, properties and contextual actions.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContextPanelContract } from "./context-panel.contract.ts";

export const ContextPanel = defineComposition({
  id: "context-panel",
  purpose: "Read an object and use its contextual commands without leaving its destination.",
  owner: { entry: "ContextPanel.svelte" },
  uses: ["attention-status", "context-properties", "destination-row", "grouped-panel", "media-object", "node-renderer", "reading-content"], renders: ["context"], approval: "none", contract: ContextPanelContract,
} as const);
