// LabelsControl: the labels control; it writes free labels itself (removable tags, then a popover that writes a new one)
// and hands reference and media-reference nodes to their selectors.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LabelsControlContract } from "./labels-control.contract.ts";

export const LabelsControl = defineComposition({
  id: "labels-control",
  purpose: { key: "labelsControl.purpose" },
  messages: ["labelsControl.purpose", "labelsControl.add", "labelsControl.newLabel", "labelsControl.label", "labelsControl.remove"],
  owner: { entry: "LabelsControl.svelte" },
  uses: ["action", "column", "field", "form", "inline", "media-reference-selector", "popover", "reference-selector", "stack-layout", "tag", "text"],
  renders: ["control.labels"], approval: "none", contract: LabelsControlContract,
} as const);
