// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ScrollEdgesContract } from "./scroll-edges.contract.ts";

export const ScrollEdges = defineFoundation({
  id: "scroll-edges",
  purpose: "Declared as found at the start of the migration: ScrollEdges.svelte.",
  owner: { entry: "ScrollEdges.svelte", parts: ["scroll-edges.css", "scroll-edges.ts"] },
  shape: "none", states: ["default"], approval: "required", contract: ScrollEdgesContract,
} as const);
