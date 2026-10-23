// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PlaybackControlsContract } from "./playback-controls.contract.ts";

export const PlaybackControls = defineComposition({
  id: "playback-controls",
  purpose: "Declared as found at the start of the migration: PlaybackControls.svelte.",
  owner: { entry: "PlaybackControls.svelte" },
  uses: [], approval: "none", contract: PlaybackControlsContract,
} as const);
