// ViewDestinationLink: one view output shown as a destination row in a grouped panel.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewDestinationLinkContract } from "./view-destination-link.contract.ts";

export const ViewDestinationLink = defineComposition({
  id: "view-destination-link",
  purpose: "Navigate or invoke an action through a row with a representative icon, distinct from object rows.",
  owner: { entry: "ViewDestinationLink.svelte" },
  uses: ["destination-row", "grouped-panel"], approval: "none", contract: ViewDestinationLinkContract,
} as const);
