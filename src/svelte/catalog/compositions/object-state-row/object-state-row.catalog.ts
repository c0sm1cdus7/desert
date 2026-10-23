// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ObjectStateRowContract } from "./object-state-row.contract.ts";

export const ObjectStateRow = defineComposition({
  id: "object-state-row",
  purpose: "Use a named state selector that dispatches canonical commands without adding toolbar shortcuts.",
  owner: { entry: "ObjectStateRow.svelte" },
  uses: ["selection-field"], approval: "none", contract: ObjectStateRowContract,
} as const);
