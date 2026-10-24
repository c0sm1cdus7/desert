// FrameBody: the body of a surface frame, dispatched by content kind to the node renderer, information, utilities or a message.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FrameBodyContract } from "./frame-body.contract.ts";

export const FrameBody = defineComposition({
  id: "frame-body",
  purpose: "Render the body of a surface frame by its content kind and route its events to the frame.",
  owner: { entry: "FrameBody.svelte" },
  uses: ["information", "message-body", "node-renderer", "utility-actions"], approval: "none", contract: FrameBodyContract,
} as const);
