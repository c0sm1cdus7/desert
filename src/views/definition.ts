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
/** A string a person typed or a product resolved: user data, and the compiled form of a message. */
export const text = immutable(Type.String({ minLength: 1, pattern: "\\S" }));

/** A message key: an owner segment and at least one meaning segment (`notes.title`, `errors.CONTRACT_MISMATCH`). */
export const MessageKeyPattern = "^[a-z][A-Za-z0-9]*(?:\\.[A-Za-z][A-Za-z0-9_]*)+$";
/** A human-visible sentence named by its key in the owner's message catalog (plan §14). Declarations carry only the key;
 * the catalog of the exposure's locale resolves it at build time, and a key absent from that bundle is MESSAGE_MISSING. */
export const message = closed({ key: Type.String({ pattern: MessageKeyPattern }) });
/** The authored value of a `message` field: produced by a generated `m` accessor, never written by hand. */
export type Message<Key extends string = string> = { readonly key: Key };
