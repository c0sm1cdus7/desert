// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpeedDialContract } from "./speed-dial.contract.ts";

export const SpeedDial = defineComposition({
  id: "speed-dial",
  purpose: "Reveal overflowing contextual commands beside their readable labels, without putting content navigation in the toolbar.",
  owner: { entry: "SpeedDial.svelte" },
  uses: ["node-renderer"], approval: "none", contract: SpeedDialContract,
} as const);
