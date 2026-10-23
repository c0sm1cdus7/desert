// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ReferenceValuesContract } from "./reference-values.contract.ts";

export const ReferenceValues = defineFoundation({
  id: "reference-values",
  purpose: "Read selected object references using their labels and shared value layout.",
  owner: { entry: "ReferenceValues.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: ReferenceValuesContract,
} as const);
