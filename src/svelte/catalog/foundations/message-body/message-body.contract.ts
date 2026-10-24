// The props of MessageBody. `content` is a surface frame's message; `messageDialog` reads it as the description of a
// message dialog instead of a status paragraph.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const MessageBodyContract = {
  props: Type.Object({
    content: Type.Object({ kind: Type.Literal("message"), text: text }, { additionalProperties: false }),
    messageDialog: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
