// Swipe motion: direct manipulation of an edge-anchored pane until release. Owned by shell (the navigation pane's
// dismiss drag and the edge reveal), used by modal for its drawer drag (F1d). It replaces infra/swipe-motion.svelte.ts,
// whose visual package (svelte/motion) no infra module may import (rule F).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const SwipeMotionMechanism = defineMechanism({ id: "swipe-motion", owner: "shell", files: ["swipe-motion.svelte.ts"] } as const);
