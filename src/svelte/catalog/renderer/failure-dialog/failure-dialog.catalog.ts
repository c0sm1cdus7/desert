// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FailureDialogContract } from "./failure-dialog.contract.ts";

export const FailureDialog = defineComposition({
  id: "failure-dialog",
  purpose: "Declared as found at the start of the migration: FailureDialog.svelte.",
  owner: { entry: "FailureDialog.svelte" },
  uses: ["node-renderer"], approval: "none", contract: FailureDialogContract,
} as const);
