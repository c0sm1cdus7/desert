// ConfirmationDialog: a compact modal message that asks for an explicit answer; dismissing it chooses the secondary
// action when that action is ready.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ConfirmationDialogContract } from "./confirmation-dialog.contract.ts";

export const ConfirmationDialog = defineComposition({
  id: "confirmation-dialog",
  purpose: "Ask for explicit confirmation in a compact temporary surface with clear primary and secondary actions.",
  owner: { entry: "ConfirmationDialog.svelte" },
  uses: ["surface-frame"], approval: "required", contract: ConfirmationDialogContract,
} as const);
