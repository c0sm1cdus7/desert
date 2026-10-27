// FactRow: one label and its value in a definition list; label values read as tags or as named references, and a control
// row holds the control that changes the fact (it absorbs the object state row's anatomy).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FactRowContract } from "./fact-row.contract.ts";

export const FactRow = defineFoundation({
  id: "fact-row",
  purpose: { key: "factRow.purpose" },
  messages: ["factRow.purpose", "factRow.unavailable"],
  owner: { entry: "FactRow.svelte" },
  shape: "none", states: ["value", "unknown", "labels", "no-labels", "references", "control"],
  variants: { kind: ["value", "control"] },
  stateVariants: { value: { kind: ["value"] }, unknown: { kind: ["value"] }, labels: { kind: ["value"] }, "no-labels": { kind: ["value"] },
    references: { kind: ["value"] }, control: { kind: ["control"] } },
  slots: { control: { accepts: ["choice"] } },
  approval: "required", contract: FactRowContract,
} as const);
