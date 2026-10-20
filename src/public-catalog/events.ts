import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { closedObject, LogicalIdSchema } from "./node-schema.ts";

export const CatalogEventSchema = Type.Union([
  closedObject({ kind: Type.Literal("catalog.open"), record: LogicalIdSchema }),
  closedObject({ kind: Type.Literal("catalog.back") }),
  closedObject({ kind: Type.Literal("catalog.search"), query: Type.String() }),
]);
export type CatalogEvent = Frozen<Static<typeof CatalogEventSchema>>;
export function catalogEvent(value: unknown): CatalogEvent {
  const event = jsonSnapshot(value);
  if (!Check(CatalogEventSchema, event)) throw new Error("INVALID_CATALOG_EVENT");
  return freezeDeep(event);
}
