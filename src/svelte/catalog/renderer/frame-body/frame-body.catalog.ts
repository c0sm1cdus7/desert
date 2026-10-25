// FrameBody: the body of a surface frame, dispatched by content kind to the node renderer, information, utilities or a
// message drawn as text.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FrameBodyContract } from "./frame-body.contract.ts";

export const FrameBody = defineComposition({
  id: "frame-body",
  purpose: { key: "frameBody.purpose" },
  messages: ["frameBody.purpose"],
  owner: { entry: "FrameBody.svelte" },
  uses: ["information", "node-renderer", "text", "utility-actions"], approval: "none", contract: FrameBodyContract,
} as const);
