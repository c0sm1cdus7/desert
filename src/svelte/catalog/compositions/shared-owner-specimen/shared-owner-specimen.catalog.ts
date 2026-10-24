// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SharedOwnerSpecimenContract } from "./shared-owner-specimen.contract.ts";

export const SharedOwnerSpecimen = defineComposition({
  id: "shared-owner-specimen",
  purpose: "Exercise one shared catalog owner with local example data, without running product commands.",
  owner: { entry: "SharedOwnerSpecimen.svelte" },
  uses: ["access-appearance-specimen", "attention-indicator", "attention-list", "attention-status", "collection", "confirmation-dialog", "content-flow", "context-properties", "destination-row", "feedback", "grouped-panel", "information", "measured-field", "media-reference-specimen", "object-state-control", "object-state-row", "reading-content", "reference-specimen", "related-selection", "selection-field", "speed-dial", "stack-layout", "summary-widget", "surface-specimen", "toolbar-layout", "view-destination-link"], approval: "none", contract: SharedOwnerSpecimenContract,
} as const);
