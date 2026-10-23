// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ContractInspectionContract } from "./contract-inspection.contract.ts";

export const ContractInspection = defineComposition({
  id: "contract-inspection",
  purpose: "Declared as found at the start of the migration: ContractInspection.svelte.",
  owner: { entry: "ContractInspection.svelte" },
  uses: ["information", "stack-layout"], approval: "none", contract: ContractInspectionContract,
} as const);
