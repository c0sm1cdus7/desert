// FailureDialog: the problem dialog that explains a failed command by its code, and closes on any of its events.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FailureDialogContract } from "./failure-dialog.contract.ts";

export const FailureDialog = defineComposition({
  id: "failure-dialog",
  purpose: "Explain a failed command in a problem dialog derived from its failure code, saying when the outcome is uncertain.",
  owner: { entry: "FailureDialog.svelte" },
  uses: ["node-renderer"], approval: "none", contract: FailureDialogContract,
} as const);
