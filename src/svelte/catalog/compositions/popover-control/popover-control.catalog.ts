// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PopoverControlContract } from "./popover-control.contract.ts";

export const PopoverControl = defineComposition({
  id: "popover-control",
  purpose: "Read contextual information in a temporary surface anchored to its trigger.",
  owner: { entry: "PopoverControl.svelte", parts: ["AnchoredSurface.svelte"] },
  uses: ["frame-body", "node-renderer"], approval: "none", contract: PopoverControlContract,
} as const);
