import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { ControlEventSchema } from "./control-nodes.ts";
import { SurfaceIntentSchema } from "./intent.ts";
import { LocalIntentSchema } from "./bank-schema.ts";
import { CatalogEventSchema } from "../public-catalog/events.ts";

const closed = { additionalProperties: false };
const text = () => Type.String({ minLength: 1 });
export const BankEventSchema = Type.Union([
  ...ControlEventSchema.anyOf,
  ...CatalogEventSchema.anyOf,
  Type.Object({ kind: Type.Literal("input.change"), name: text(), value: Type.String() }, closed),
  Type.Object({ kind: Type.Literal("surface.invoke"), intent: SurfaceIntentSchema }, closed),
  Type.Object({ kind: Type.Literal("local.invoke"), intent: LocalIntentSchema }, closed),
  Type.Object({ kind: Type.Literal("collection.select"), id: text() }, closed),
  Type.Object({ kind: Type.Literal("transient.close") }, closed),
  Type.Object({ kind: Type.Literal("transient.closed") }, closed),
  Type.Object({ kind: Type.Literal("problem.close") }, closed),
]);
export type BankEvent = Frozen<Static<typeof BankEventSchema>>;
export function bankEvent(value: unknown): BankEvent {
  const event = jsonSnapshot(value);
  if (!Check(BankEventSchema, event)) throw new Error("INVALID_BANK_EVENT");
  return freezeDeep(event);
}
