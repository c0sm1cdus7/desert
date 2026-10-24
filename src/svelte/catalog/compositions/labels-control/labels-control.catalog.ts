// LabelsControl: the labels control; it writes free labels itself and hands reference and media-reference nodes to
// their selectors.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LabelsControlContract } from "./labels-control.contract.ts";

export const LabelsControl = defineComposition({
  id: "labels-control",
  purpose: "Compose the field well, value rail and options from the same shared owners as every labels control.",
  owner: { entry: "LabelsControl.svelte" },
  uses: ["character-counter", "field", "label-rail", "media-reference-selector", "node-renderer", "reference-selector", "stack-layout"], renders: ["control.labels"], approval: "none", contract: LabelsControlContract,
} as const);
