// SpecimenGroup: the examples of one resolved node kind in the component bank, as the entry's region: a state chooser,
// the state's notice and the kind's contract inspection.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenGroupContract } from "./specimen-group.contract.ts";

export const SpecimenGroup = defineComposition({
  id: "specimen-group",
  purpose: { key: "specimenGroup.purpose" },
  messages: ["specimenGroup.purpose", "specimenGroup.state", "specimenGroup.examples", "specimenGroup.loading", "specimenGroup.offline"],
  owner: { entry: "SpecimenGroup.svelte" },
  uses: ["choice", "column", "contract-inspection", "stack-layout", "text", "view-region"],
  slots: { children: { accepts: ["specimen-row"] } }, approval: "none", contract: SpecimenGroupContract,
} as const);
