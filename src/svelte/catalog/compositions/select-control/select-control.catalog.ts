// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SelectControlContract } from "./select-control.contract.ts";

export const SelectControl = defineComposition({
  id: "select-control",
  purpose: "Choose one value from a labeled field and a shared options popover.",
  owner: { entry: "SelectControl.svelte" },
  uses: ["node-renderer", "measured-field", "selection-field"], approval: "none", contract: SelectControlContract,
} as const);
