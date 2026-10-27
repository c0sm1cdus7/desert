// ControlRenderer: draws one control node through the node renderer and forwards only its control events.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ControlRendererContract } from "./control-renderer.contract.ts";

export const ControlRenderer = defineComposition({
  id: "control-renderer",
  purpose: { key: "controlRenderer.purpose" },
  messages: ["controlRenderer.purpose"],
  owner: { entry: "ControlRenderer.svelte" },
  uses: ["node-renderer"], approval: "none", contract: ControlRendererContract,
} as const);
