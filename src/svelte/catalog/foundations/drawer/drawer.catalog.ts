// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { DrawerContract } from "./drawer.contract.ts";

export const Drawer = defineFoundation({
  id: "drawer",
  purpose: "Open a temporary surface over its parent with content and top or bottom toolbars, never lateral child surfaces.",
  owner: { entry: "Drawer.svelte", parts: ["adaptive-modality.svelte.ts", "adaptive-surface-layout.ts"], vendor: ["dialog"] },
  shape: "none", states: ["default"], approval: "required", contract: DrawerContract,
} as const);
