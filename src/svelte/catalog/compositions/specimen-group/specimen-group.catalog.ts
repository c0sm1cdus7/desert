// SpecimenGroup: the examples of one resolved node kind in the component bank, with a state chooser, the state's
// notice and the kind's contract inspection.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenGroupContract } from "./specimen-group.contract.ts";

export const SpecimenGroup = defineComposition({
  id: "specimen-group",
  purpose: "Group the bank examples of one resolved node kind under a state chooser and its contract inspection.",
  owner: { entry: "SpecimenGroup.svelte" },
  uses: ["contract-inspection", "feedback", "measured-field", "selection-field", "stack-layout"], slots: { children: { accepts: ["specimen-row"] } }, approval: "none", contract: SpecimenGroupContract,
} as const);
