// ReferenceValues: the selected object references of a field, each read by its label (and color, when it has one);
// a reference no longer known reads as unavailable.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ReferenceValuesContract } from "./reference-values.contract.ts";

export const ReferenceValues = defineFoundation({
  id: "reference-values",
  purpose: "Read selected object references using their labels and shared value layout.",
  owner: { entry: "ReferenceValues.svelte" },
  shape: "none", states: ["default", "unavailable"], approval: "required", contract: ReferenceValuesContract,
} as const);
