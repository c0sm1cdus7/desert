// ReferenceSpecimen: a bank specimen that mounts one labels or reference owner with local example values: a rail of
// removable tags, a reference read beside its color, the references of a field, the reference selector or the labels field.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReferenceSpecimenContract } from "./reference-specimen.contract.ts";

export const ReferenceSpecimen = defineComposition({
  id: "reference-specimen",
  purpose: { key: "referenceSpecimen.purpose" },
  messages: ["referenceSpecimen.purpose", "referenceSpecimen.remove", "referenceSpecimen.unavailable"],
  owner: { entry: "ReferenceSpecimen.svelte" },
  uses: ["inline", "labels-control", "reference-selector", "tag"], approval: "none", contract: ReferenceSpecimenContract,
} as const);
