// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { PlaybackCanvasContract } from "./playback-canvas.contract.ts";

export const PlaybackCanvas = defineFoundation({
  id: "playback-canvas",
  purpose: "Declared as found at the start of the migration: PlaybackCanvas.svelte.",
  owner: { entry: "PlaybackCanvas.svelte", vendor: ["slider"] },
  shape: "none", states: ["default"], approval: "required", contract: PlaybackCanvasContract,
} as const);
