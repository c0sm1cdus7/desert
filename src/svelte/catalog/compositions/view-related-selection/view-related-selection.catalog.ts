// ViewRelatedSelection: the related selection of a view panel, raising its changes as node events.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewRelatedSelectionContract } from "./view-related-selection.contract.ts";

export const ViewRelatedSelection = defineComposition({
  id: "view-related-selection",
  purpose: "Mount the related selection of a view panel and forward its changes as node events.",
  owner: { entry: "ViewRelatedSelection.svelte" },
  uses: ["related-selection"], approval: "none", contract: ViewRelatedSelectionContract,
} as const);
