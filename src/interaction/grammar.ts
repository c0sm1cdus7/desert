import { Type } from "@sinclair/typebox";
import { InteractionCatalog } from "./catalog.ts";
import type { InputPrimitive } from "./catalog.ts";

export const InputPrimitiveSchema = Type.Union(InteractionCatalog.entries
  .filter((entry): entry is Extract<typeof entry, { id: InputPrimitive }> => entry.id.startsWith("input."))
  .map(entry => Type.Literal(entry.id)));
