// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewPanelContract } from "./view-panel.contract.ts";

export const ViewPanel = defineComposition({
  id: "view-panel",
  purpose: "Present a view's resolved panel as a confirmation dialog or a drawer, reporting its events as node events.",
  owner: { entry: "ViewPanel.svelte" },
  uses: ["confirmation-dialog", "drawer"], approval: "none", contract: ViewPanelContract,
} as const);
