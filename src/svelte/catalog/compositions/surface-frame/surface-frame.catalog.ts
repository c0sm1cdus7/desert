// SurfaceFrame: the frame every surface shares, drawn by the surface foundation: its top toolbar, its scrolling content
// (a form, a message, facts or a resolved view) and, for steps, confirmations and messages, its bottom toolbar.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SurfaceFrameContract } from "./surface-frame.contract.ts";

export const SurfaceFrame = defineComposition({
  id: "surface-frame",
  purpose: { key: "surfaceFrame.purpose" },
  messages: ["surfaceFrame.purpose", "surfaceFrame.context", "surfaceFrame.journey"],
  owner: { entry: "SurfaceFrame.svelte" },
  uses: ["content-flow", "frame-body", "surface", "toolbar"], approval: "required", contract: SurfaceFrameContract,
} as const);
