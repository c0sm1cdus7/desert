// SpecimenRow: one fixture state of a bank entry, an item region shown only when the specimen selection names that state.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenRowContract } from "./specimen-row.contract.ts";

export const SpecimenRow = defineComposition({
  id: "specimen-row",
  purpose: { key: "specimenRow.purpose" },
  messages: ["specimenRow.purpose"],
  owner: { entry: "SpecimenRow.svelte" },
  uses: ["stack-item", "view-region"],
  slots: { children: { accepts: ["public-catalog-bank-specimen", "specimen-unavailable", "control-renderer", "catalog-home"] } },
  approval: "none", contract: SpecimenRowContract,
} as const);
