// SpecimenUnavailable: a note in place of a bank specimen that cannot be executed here, with the reason.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenUnavailableContract } from "./specimen-unavailable.contract.ts";

export const SpecimenUnavailable = defineComposition({
  id: "specimen-unavailable",
  purpose: { key: "specimenUnavailable.purpose" },
  messages: ["specimenUnavailable.purpose", "specimenUnavailable.label", "specimenUnavailable.title"],
  owner: { entry: "SpecimenUnavailable.svelte" },
  uses: ["status"], approval: "none", contract: SpecimenUnavailableContract,
} as const);
