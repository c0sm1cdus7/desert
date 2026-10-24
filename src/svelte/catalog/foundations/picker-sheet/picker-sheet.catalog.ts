// PickerSheet: the transitional adapter of the piece merged into modal (presentation "sheet"): a picker presented at the
// bottom edge with its grip and close toolbar, returning focus to its trigger. Its contract stays a stub.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { PickerSheetContract } from "./picker-sheet.contract.ts";

export const PickerSheet = defineFoundation({
  id: "picker-sheet",
  purpose: "Present a picker as a bottom sheet with a grip and a close toolbar, returning focus to its trigger on dismissal.",
  owner: { entry: "PickerSheet.svelte", mechanisms: ["surface-focus"] },
  shape: "none", states: ["default"], approval: "required", contract: PickerSheetContract,
} as const);
