// ViewPanel: a view's resolved panel, a confirmation dialog or a modal frame; dismissing a frame chooses its own way out.
// The node renderer mounts it for a transient node (`renders: ["transient"]`): Modal over that node's frame.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewPanelContract } from "./view-panel.contract.ts";

export const ViewPanel = defineComposition({
  id: "view-panel",
  purpose: { key: "viewPanel.purpose" },
  messages: ["viewPanel.purpose"],
  owner: { entry: "ViewPanel.svelte" },
  uses: ["dialog", "instance-frame", "modal", "surface-frame"], renders: ["transient"], approval: "none", contract: ViewPanelContract,
} as const);
