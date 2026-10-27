// ViewDestinationLink: one view output shown as a destination row in a grouped panel.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewDestinationLinkContract } from "./view-destination-link.contract.ts";

export const ViewDestinationLink = defineComposition({
  id: "view-destination-link",
  purpose: { key: "viewDestinationLink.purpose" },
  messages: ["viewDestinationLink.purpose"],
  owner: { entry: "ViewDestinationLink.svelte" },
  uses: ["list", "row"], approval: "none", contract: ViewDestinationLinkContract,
} as const);
