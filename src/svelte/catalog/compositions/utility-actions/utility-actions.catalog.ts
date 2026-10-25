// UtilityActions: the one column of secondary utility actions shared by anchored and frame hosts.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { UtilityActionsContract } from "./utility-actions.contract.ts";

export const UtilityActions = defineComposition({
  id: "utility-actions",
  purpose: { key: "utilityActions.purpose" },
  messages: ["utilityActions.purpose"],
  owner: { entry: "UtilityActions.svelte" },
  uses: ["column", "node-renderer"], approval: "none", contract: UtilityActionsContract,
} as const);
