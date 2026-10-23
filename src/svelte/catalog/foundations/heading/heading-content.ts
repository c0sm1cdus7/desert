import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";

/** Meaning determines the owner's type role. No CSS or arbitrary markup input. */
const HeadingContentSchema = Type.Union([
  Type.Object({ kind: Type.Literal("page"), text: Type.String(), focusTarget: Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("document-title"), text: Type.String() }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("rail-title"), text: Type.String(), id: Type.String({ minLength: 1 }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("group-label"), text: Type.String(), required: Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
]);
export type HeadingContent = Static<typeof HeadingContentSchema>;
export function assertHeadingContent(value: unknown): asserts value is HeadingContent {
  if (!value || typeof value !== "object" || Reflect.ownKeys(value).some(key => typeof key === "symbol")
    || !Check(HeadingContentSchema, value)) throw new Error("INVALID_HEADING_CONTENT");
}
