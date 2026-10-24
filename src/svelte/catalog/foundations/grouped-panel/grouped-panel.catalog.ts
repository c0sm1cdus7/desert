// GroupedPanel: one shared pane that holds sibling rows, at reading or overview width.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { GroupedPanelContract } from "./grouped-panel.contract.ts";

export const GroupedPanel = defineFoundation({
  id: "grouped-panel",
  purpose: "Hold sibling rows in one shared pane, at the reading measure or the full overview width.",
  owner: { entry: "GroupedPanel.svelte", vendor: ["card"] },
  shape: "none", states: ["default"],
  variants: { measure: ["reading", "overview"] },
  slots: { children: { accepts: ["destination-row", "choice-list", "choice-row", "information", "attention-indicator", "action", "image"] } },
  approval: "required", contract: GroupedPanelContract,
} as const);
