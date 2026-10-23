// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContextPanelContract } from "./context-panel.contract.ts";

export const ContextPanel = defineComposition({
  id: "context-panel",
  purpose: "Read an object and use its contextual commands without leaving its destination.",
  owner: { entry: "ContextPanel.svelte" },
  uses: ["attention-status", "node-renderer", "context-properties", "destination-row", "grouped-panel", "media-object", "reading-content"], approval: "none", contract: ContextPanelContract,
} as const);
