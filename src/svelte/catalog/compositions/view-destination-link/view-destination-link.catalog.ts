// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewDestinationLinkContract } from "./view-destination-link.contract.ts";

export const ViewDestinationLink = defineComposition({
  id: "view-destination-link",
  purpose: "Navigate or invoke an action through a row with a representative icon, distinct from object rows.",
  owner: { entry: "ViewDestinationLink.svelte" },
  uses: ["destination-row", "grouped-panel"], approval: "none", contract: ViewDestinationLinkContract,
} as const);
