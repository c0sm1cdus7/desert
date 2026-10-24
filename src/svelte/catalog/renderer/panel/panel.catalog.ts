// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PanelContract } from "./panel.contract.ts";

export const Panel = defineComposition({
  id: "panel",
  purpose: "Declared as found at the start of the migration: Panel.svelte.",
  owner: { entry: "Panel.svelte" },
  uses: ["view-panel"], approval: "none", contract: PanelContract,
} as const);
