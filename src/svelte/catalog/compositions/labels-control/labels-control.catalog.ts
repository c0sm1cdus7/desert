// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LabelsControlContract } from "./labels-control.contract.ts";

export const LabelsControl = defineComposition({
  id: "labels-control",
  purpose: "Compose the field well, value rail and options from the same shared owners as every labels control.",
  owner: { entry: "LabelsControl.svelte" },
  uses: ["character-counter", "label-rail", "media-reference-selector", "node-renderer", "reference-selector", "stack-layout", "text-input"], approval: "none", contract: LabelsControlContract,
} as const);
