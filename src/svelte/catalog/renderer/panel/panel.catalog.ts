// Panel: the renderer entry that keeps an owned view panel mounted while it opens and closes, and routes its events
// with the owner it was mounted for.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PanelContract } from "./panel.contract.ts";

export const Panel = defineComposition({
  id: "panel",
  purpose: "Keep an owned view panel mounted across open and close, routing its events with the owner it was mounted for.",
  owner: { entry: "Panel.svelte" },
  uses: ["view-panel"], approval: "none", contract: PanelContract,
} as const);
