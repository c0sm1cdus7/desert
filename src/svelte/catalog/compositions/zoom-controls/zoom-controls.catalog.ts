// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ZoomControlsContract } from "./zoom-controls.contract.ts";

export const ZoomControls = defineComposition({
  id: "zoom-controls",
  purpose: "Declared as found at the start of the migration: ZoomControls.svelte.",
  owner: { entry: "ZoomControls.svelte" },
  uses: [], approval: "none", contract: ZoomControlsContract,
} as const);
