// FailureDialog: the dialog that explains a failed command by its code, and closes on its one choice or on dismissal.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FailureDialogContract } from "./failure-dialog.contract.ts";

export const FailureDialog = defineComposition({
  id: "failure-dialog",
  purpose: { key: "failureDialog.purpose" },
  messages: ["failureDialog.purpose", "failureDialog.close"],
  owner: { entry: "FailureDialog.svelte" },
  uses: ["dialog"], approval: "none", contract: FailureDialogContract,
} as const);
