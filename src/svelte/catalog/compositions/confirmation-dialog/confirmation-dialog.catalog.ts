// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ConfirmationDialogContract } from "./confirmation-dialog.contract.ts";

export const ConfirmationDialog = defineComposition({
  id: "confirmation-dialog",
  purpose: "Ask for explicit confirmation in a compact temporary surface with clear primary and secondary actions.",
  owner: { entry: "ConfirmationDialog.svelte" },
  uses: ["surface-frame"], approval: "required", contract: ConfirmationDialogContract,
} as const);
