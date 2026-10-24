// PopoverControl: a popover control node drawn as a trigger with an anchored, nonmodal information surface.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PopoverControlContract } from "./popover-control.contract.ts";

export const PopoverControl = defineComposition({
  id: "popover-control",
  purpose: "Read contextual information in a temporary surface anchored to its trigger.",
  owner: { entry: "PopoverControl.svelte", parts: ["AnchoredSurface.svelte"] },
  uses: ["frame-body", "node-renderer"], renders: ["control.popover"], approval: "none", contract: PopoverControlContract,
} as const);
