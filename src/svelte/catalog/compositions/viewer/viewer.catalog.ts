// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewerContract } from "./viewer.contract.ts";

export const Viewer = defineComposition({
  id: "viewer",
  purpose: "Declared as found at the start of the migration: Viewer.svelte.",
  owner: { entry: "Viewer.svelte" },
  uses: ["image", "playback-canvas", "toolbar-layout"], approval: "none", contract: ViewerContract,
} as const);
