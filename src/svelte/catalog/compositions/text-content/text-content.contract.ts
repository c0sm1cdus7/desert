// The props of TextContent: the one paragraph of reading text it places.
import { Type } from "@sinclair/typebox";

export const TextContentContract = {
  props: Type.Object({ text: Type.String() }, { additionalProperties: false }),
} as const;
