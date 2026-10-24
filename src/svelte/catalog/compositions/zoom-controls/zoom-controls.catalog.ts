// ZoomControls: zoom out, the current zoom percentage (which resets it) and zoom in, for media in the toolbar.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ZoomControlsContract } from "./zoom-controls.contract.ts";

export const ZoomControls = defineComposition({
  id: "zoom-controls",
  purpose: "Step a media view's zoom out or in between 100% and its maximum, and reset it from the shown percentage.",
  owner: { entry: "ZoomControls.svelte" },
  uses: ["icon"], approval: "none", contract: ZoomControlsContract,
} as const);
