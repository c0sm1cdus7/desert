import { Clone, Type, type TProperties, type TSchema } from "@sinclair/typebox";
import { freezeDeep } from "../json.ts";

// Clone before freezing: canonical schemas remain owned by their modules.
export function immutable<T extends TSchema>(schema: T): T {
  const copy = Clone(schema);
  freezeDeep(copy);
  return copy;
}
export const closed = <P extends TProperties>(properties: P) =>
  immutable(Type.Object(properties, { additionalProperties: false }));
export const name = immutable(Type.String({ pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$" }));
export const text = immutable(Type.String({ minLength: 1, pattern: "\\S" }));
