// ContractInspection: the contract, coverage gaps and evidence references of one resolved node kind, read from the
// resolved node catalog, as three titled stacks in a column.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContractInspectionContract } from "./contract-inspection.contract.ts";

export const ContractInspection = defineComposition({
  id: "contract-inspection",
  purpose: { key: "contractInspection.purpose" },
  messages: ["contractInspection.purpose", "contractInspection.contract", "contractInspection.coverageGaps",
    "contractInspection.evidence", "contractInspection.component", "contractInspection.sharedOwners",
    "contractInspection.qualification", "contractInspection.fixtures"],
  owner: { entry: "ContractInspection.svelte" },
  uses: ["column", "information", "stack-layout", "view-region"], approval: "none", contract: ContractInspectionContract,
} as const);
