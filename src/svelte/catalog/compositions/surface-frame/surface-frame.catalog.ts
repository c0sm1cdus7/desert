// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SurfaceFrameContract } from "./surface-frame.contract.ts";

export const SurfaceFrame = defineComposition({
  id: "surface-frame",
  purpose: "Declared as found at the start of the migration: SurfaceFrame.svelte.",
  owner: { entry: "SurfaceFrame.svelte" },
  uses: ["content-flow", "frame-body", "scroll-edges", "toolbar"], approval: "required", contract: SurfaceFrameContract,
} as const);
