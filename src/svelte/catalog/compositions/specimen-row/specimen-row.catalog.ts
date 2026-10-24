// SpecimenRow: one fixture state of a bank entry, shown only when the specimen selection names that state.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenRowContract } from "./specimen-row.contract.ts";

export const SpecimenRow = defineComposition({
  id: "specimen-row",
  purpose: "Witness one fixture state of a bank entry, marking whether it is rendered or a gap, inside its own heading scope.",
  owner: { entry: "SpecimenRow.svelte" },
  uses: ["stack-item"],
  slots: { children: { accepts: ["public-catalog-bank-specimen", "specimen-unavailable", "control-renderer", "catalog-home"] } },
  approval: "none", contract: SpecimenRowContract,
} as const);
