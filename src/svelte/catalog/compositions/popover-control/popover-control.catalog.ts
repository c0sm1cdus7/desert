// PopoverControl: a popover control node drawn as a trigger with an anchored, nonmodal information surface.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PopoverControlContract } from "./popover-control.contract.ts";

export const PopoverControl = defineComposition({
  id: "popover-control",
  purpose: { key: "popoverControl.purpose" },
  messages: ["popoverControl.purpose"],
  owner: { entry: "PopoverControl.svelte" },
  uses: ["frame-body", "popover"], renders: ["control.popover"], approval: "none", contract: PopoverControlContract,
} as const);
