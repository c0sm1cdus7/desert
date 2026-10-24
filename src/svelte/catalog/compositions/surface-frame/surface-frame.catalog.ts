// SurfaceFrame: the frame every surface shares, its top toolbar, its scrolling content (a form, a message, facts or a
// resolved view) and, for steps, confirmations and messages, its bottom toolbar.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SurfaceFrameContract } from "./surface-frame.contract.ts";

export const SurfaceFrame = defineComposition({
  id: "surface-frame",
  purpose: "Frame one surface with its top toolbar, scrolling content and, when it has choices to make, its bottom toolbar.",
  owner: { entry: "SurfaceFrame.svelte" },
  uses: ["content-flow", "frame-body", "scroll-edges", "toolbar"], approval: "required", contract: SurfaceFrameContract,
} as const);
