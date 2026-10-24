// PickerSheet: the bottom sheet that presents a picker (a calendar, a list of choices) on a narrow screen, with a grip,
// a close toolbar unless its content brings its own, and focus returned to the trigger. Its contract stays a stub.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { PickerSheetContract } from "./picker-sheet.contract.ts";

export const PickerSheet = defineFoundation({
  id: "picker-sheet",
  purpose: "Present a picker as a bottom sheet with a grip and a close toolbar, returning focus to its trigger on dismissal.",
  owner: { entry: "PickerSheet.svelte" },
  shape: "none", states: ["default", "content-toolbar"], approval: "required", contract: PickerSheetContract,
} as const);
