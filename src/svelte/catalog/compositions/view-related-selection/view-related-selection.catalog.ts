// ViewRelatedSelection: the related selection of a view panel, raising its changes as node events.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewRelatedSelectionContract } from "./view-related-selection.contract.ts";

export const ViewRelatedSelection = defineComposition({
  id: "view-related-selection",
  purpose: { key: "viewRelatedSelection.purpose" },
  messages: ["viewRelatedSelection.purpose"],
  owner: { entry: "ViewRelatedSelection.svelte" },
  uses: ["related-selection"], approval: "none", contract: ViewRelatedSelectionContract,
} as const);
