// FactRow: one label and its value in a definition list; label values read as tags or as named references, and a control
// row holds the control that changes the fact (it absorbs the object state row's anatomy).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FactRowContract } from "./fact-row.contract.ts";

export const FactRow = defineFoundation({
  id: "fact-row",
  purpose: "Keep a capitalized label on the left and its value or its control right-aligned, with shared horizontal dividers and balanced wrapping.",
  owner: { entry: "FactRow.svelte" },
  shape: "none", states: ["value", "unknown", "labels", "no-labels", "references", "control"],
  variants: { kind: ["value", "control"] },
  stateVariants: { value: { kind: ["value"] }, unknown: { kind: ["value"] }, labels: { kind: ["value"] }, "no-labels": { kind: ["value"] },
    references: { kind: ["value"] }, control: { kind: ["control"] } },
  // F1-merge: the control slot accepts choice (F1c) once SelectionField merges into it.
  slots: { control: { accepts: ["selection-field"] } },
  approval: "required", contract: FactRowContract,
} as const);
