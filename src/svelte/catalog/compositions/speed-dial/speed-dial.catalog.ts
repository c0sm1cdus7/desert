// SpeedDial: the overflow trigger of a toolbar and its popover of labelled command buttons.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpeedDialContract } from "./speed-dial.contract.ts";

export const SpeedDial = defineComposition({
  id: "speed-dial",
  purpose: "Reveal overflowing contextual commands beside their readable labels, without putting content navigation in the toolbar.",
  owner: { entry: "SpeedDial.svelte" },
  uses: ["node-renderer"], approval: "none", contract: SpeedDialContract,
} as const);
