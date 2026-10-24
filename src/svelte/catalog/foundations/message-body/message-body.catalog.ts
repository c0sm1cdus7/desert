// MessageBody: the text of a surface frame's message, read as a status paragraph or as a message dialog's description.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MessageBodyContract } from "./message-body.contract.ts";

export const MessageBody = defineFoundation({
  id: "message-body",
  purpose: "Read a surface frame's message as a status paragraph, or as the description of a message dialog.",
  owner: { entry: "MessageBody.svelte" },
  shape: "none", states: ["default", "dialog"], approval: "required", contract: MessageBodyContract,
} as const);
