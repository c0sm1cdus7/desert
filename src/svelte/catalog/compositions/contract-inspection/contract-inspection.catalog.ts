// ContractInspection: the contract, coverage gaps and evidence references of one resolved node kind, read from the
// resolved node catalog.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContractInspectionContract } from "./contract-inspection.contract.ts";

export const ContractInspection = defineComposition({
  id: "contract-inspection",
  purpose: "Read the declared contract, coverage gaps and evidence of one resolved node kind.",
  owner: { entry: "ContractInspection.svelte" },
  uses: ["information", "stack-layout"], approval: "none", contract: ContractInspectionContract,
} as const);
