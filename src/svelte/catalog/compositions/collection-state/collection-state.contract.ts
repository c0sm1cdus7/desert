// The props of CollectionState. `loaded` says whether the collection finished loading (an empty, loaded collection shows
// the empty state); `createLabel` names the command that fills it; `connection` "offline" replaces both with a reconnect hint.
import { Type } from "@sinclair/typebox";

export const CollectionStateContract = {
  props: Type.Object({
    loaded: Type.Boolean(),
    createLabel: Type.Optional(Type.String()),
    connection: Type.Optional(Type.Union([Type.Literal("loading"), Type.Literal("ready"), Type.Literal("offline"), Type.Undefined()])),
  }, { additionalProperties: false }),
} as const;
