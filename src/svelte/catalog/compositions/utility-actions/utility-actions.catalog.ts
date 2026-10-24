// UtilityActions: the one column of secondary utility actions shared by anchored and frame hosts.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { UtilityActionsContract } from "./utility-actions.contract.ts";

export const UtilityActions = defineComposition({
  id: "utility-actions",
  purpose: "Stack a frame's utility actions as secondary actions and pass the pressed one's intent to the host.",
  owner: { entry: "UtilityActions.svelte" },
  uses: ["node-renderer"], approval: "none", contract: UtilityActionsContract,
} as const);
