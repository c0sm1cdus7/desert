// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ToolbarContract } from "./toolbar.contract.ts";

export const Toolbar = defineComposition({
  id: "toolbar",
  purpose: "Declared as found at the start of the migration: Toolbar.svelte.",
  owner: { entry: "Toolbar.svelte" },
  uses: ["toolbar-layout"], approval: "none", contract: ToolbarContract,
} as const);
