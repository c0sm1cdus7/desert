// Drawer: the temporary surface opened over its parent, docked beside it when the host has room, else a modal sheet at
// the right or bottom edge. It shows one frame with its toolbars; a locked drawer cannot be dismissed.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { DrawerContract } from "./drawer.contract.ts";

export const Drawer = defineFoundation({
  id: "drawer",
  purpose: "Open a temporary surface over its parent with content and top or bottom toolbars, never lateral child surfaces.",
  owner: { entry: "Drawer.svelte", parts: ["adaptive-modality.svelte.ts", "adaptive-surface-layout.ts"], vendor: ["dialog"] },
  shape: "none", states: ["open", "locked"], approval: "required", contract: DrawerContract,
} as const);
