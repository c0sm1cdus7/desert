// ConfirmationDialog: the transitional adapter of a confirmation frame onto Dialog; dismissing it chooses the secondary
// action when that action is ready. Batch 3 deletes it.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ConfirmationDialogContract } from "./confirmation-dialog.contract.ts";

export const ConfirmationDialog = defineComposition({
  id: "confirmation-dialog",
  purpose: { key: "confirmationDialog.purpose" },
  messages: ["confirmationDialog.purpose"],
  owner: { entry: "ConfirmationDialog.svelte" },
  uses: ["dialog"], approval: "required", contract: ConfirmationDialogContract,
} as const);
