// FactRow: one label and its value in a definition list; label values read as tags or as named references.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FactRowContract } from "./fact-row.contract.ts";

export const FactRow = defineFoundation({
  id: "fact-row",
  purpose: "Keep a capitalized label on the left and its value right-aligned, with shared horizontal dividers and balanced wrapping.",
  owner: { entry: "FactRow.svelte" },
  shape: "none", states: ["value", "unknown", "labels", "no-labels", "references"],
  approval: "required", contract: FactRowContract,
} as const);
