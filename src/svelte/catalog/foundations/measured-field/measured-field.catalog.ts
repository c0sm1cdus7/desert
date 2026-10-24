// MeasuredField: the box that gives one form control its family's preferred measure (writing, choice, date, amount)
// inside the available space, and carries the field's invalid and disabled state.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MeasuredFieldContract } from "./measured-field.contract.ts";

export const MeasuredField = defineFoundation({
  id: "measured-field",
  purpose: "Give one form control the preferred measure of its family inside the available space, with its invalid and disabled state.",
  owner: { entry: "MeasuredField.svelte" },
  shape: "none", states: ["default", "invalid", "disabled"],
  variants: { kind: ["input.text", "input.multiline", "control.select", "control.date", "control.money"] },
  slots: { children: { accepts: ["field-well", "selection-field", "picker-sheet", "node-renderer"] } },
  approval: "required", contract: MeasuredFieldContract,
} as const);
