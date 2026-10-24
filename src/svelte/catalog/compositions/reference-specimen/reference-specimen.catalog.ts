// ReferenceSpecimen: a bank specimen that mounts one labels or reference owner with local example values.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReferenceSpecimenContract } from "./reference-specimen.contract.ts";

export const ReferenceSpecimen = defineComposition({
  id: "reference-specimen",
  purpose: "Exercise one labels or reference owner in the bank with local example values and no product command.",
  owner: { entry: "ReferenceSpecimen.svelte" },
  uses: ["color-bullet", "label-rail", "labels-control", "reference-selector", "reference-values"], approval: "none", contract: ReferenceSpecimenContract,
} as const);
