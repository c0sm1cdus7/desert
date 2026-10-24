// SpecimenUnavailable: a note in place of a bank specimen that cannot be executed here, with the reason.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenUnavailableContract } from "./specimen-unavailable.contract.ts";

export const SpecimenUnavailable = defineComposition({
  id: "specimen-unavailable",
  purpose: "Explain in place of a bank specimen why it cannot be executed here.",
  owner: { entry: "SpecimenUnavailable.svelte" },
  uses: ["icon"], approval: "none", contract: SpecimenUnavailableContract,
} as const);
