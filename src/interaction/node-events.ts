import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { ControlEventSchema } from "./control-nodes.ts";
import { SurfaceIntentSchema } from "./intent.ts";
import { LocalIntentSchema } from "./resolved-node-schema.ts";
import { CatalogEventSchema } from "../public-catalog/events.ts";
import { RelatedSelectionEventSchema } from "./related-selection.ts";

const closed = { additionalProperties: false };
const text = () => Type.String({ minLength: 1 });
export const NodeEventSchema = Type.Union([
  ...ControlEventSchema.anyOf,
  ...CatalogEventSchema.anyOf,
  ...RelatedSelectionEventSchema.anyOf,
  Type.Object({ kind: Type.Literal("input.change"), name: text(), value: Type.String() }, closed),
  Type.Object({ kind: Type.Literal("surface.invoke"), intent: SurfaceIntentSchema }, closed),
  Type.Object({ kind: Type.Literal("local.invoke"), intent: LocalIntentSchema }, closed),
  Type.Object({ kind: Type.Literal("collection.select"), id: text() }, closed),
  Type.Object({ kind: Type.Literal("attention.resume"), id: text() }, closed),
  Type.Object({ kind: Type.Literal("transient.close") }, closed),
  Type.Object({ kind: Type.Literal("transient.closed") }, closed),
  Type.Object({ kind: Type.Literal("problem.close") }, closed),
]);
export type NodeEvent = Frozen<Static<typeof NodeEventSchema>>;
export function nodeEvent(value: unknown): NodeEvent {
  const event = jsonSnapshot(value);
  if (!Check(NodeEventSchema, event)) throw new Error("INVALID_BANK_EVENT");
  return freezeDeep(event);
}
