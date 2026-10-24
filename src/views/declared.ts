// Law (plan §14): a product declares human-visible text only as a message; the compiled program carries the sentence the
// exposure's locale resolved. The declared schema family is derived from the compiled one here, field by field: a property
// named in `messageFields` whose compiled schema is a free string takes `message`. Apply it to presentation schemas only:
// domain schemas (objects, journeys, commands) carry no human text. Raises MESSAGE_MISSING through the resolving bundle.
import { OptionalKind, Type, type Static, type TSchema } from "@sinclair/typebox";
import { jsonSnapshot, type Json } from "../json.ts";
import { immutable, message, type Message } from "./definition.ts";
import type { MessageBundle } from "../messages/catalog.ts";

/** The only property names whose free string is a human-visible sentence in a declaration. User data never takes these
 * positions in a declaration (a note's title is a fact, read at run time). A catalog piece's `purpose` is a message too, but
 * it is declared in the piece's catalog file (declaration-schema.ts), where a navigation entry's enumerated `purpose` is not. */
export const messageFields = Object.freeze(["label", "title", "subtitle", "description", "totalLabel", "group", "alt",
  "placeholder", "helper"] as const);
export type MessageField = typeof messageFields[number];
const fields: ReadonlySet<string> = new Set(messageFields);
/** Domain properties a presentation declaration embeds, never descended into: they name facts and journeys, not sentences
 * (`references(Project, { label: "name" })`, a command's `set: { title: ... }`). */
export const domainFields = Object.freeze(["facts", "execution", "command", "when", "set", "values", "where", "source", "journey"] as const);
const domains: ReadonlySet<string> = new Set(domainFields);

type DeclaredText<V> = V extends string ? Message : Declared<V>;
/** The declared form of a compiled type: every `string` in a message field becomes a Message. */
export type Declared<T> = T extends string | number | boolean | null | undefined ? T
  : T extends readonly unknown[] ? { [Index in keyof T]: Declared<T[Index]> }
  : { [Key in keyof T]: Key extends typeof domainFields[number] ? T[Key] : Key extends MessageField ? DeclaredText<T[Key]> : Declared<T[Key]> };

type SchemaNode = TSchema & { [key: string]: unknown };
/** A string a person reads: any string schema that is not a literal or an enumeration (those are closed vocabularies). */
const isText = (schema: SchemaNode) => schema.type === "string" && schema.const === undefined && schema.enum === undefined;

/** A spread keeps TypeBox's symbol keys (Kind, OptionalKind): they are own enumerable properties. */
const copy = (schema: SchemaNode, replace: Readonly<Record<string, unknown>>): SchemaNode => ({ ...schema, ...replace });

function declaredNode(schema: SchemaNode, inMessageField: boolean): SchemaNode {
  if (inMessageField && isText(schema)) return OptionalKind in schema ? Type.Optional(message) : message;
  const replace: Record<string, unknown> = {};
  const properties = schema.properties as Record<string, SchemaNode> | undefined;
  if (properties) replace.properties = Object.fromEntries(Object.entries(properties).map(([key, value]) =>
    [key, domains.has(key) ? value : declaredNode(value, fields.has(key))]));
  for (const key of ["anyOf", "allOf"] as const) {
    const members = schema[key] as SchemaNode[] | undefined;
    if (members) replace[key] = members.map(member => declaredNode(member, inMessageField));
  }
  const items = schema.items as SchemaNode | SchemaNode[] | undefined;
  if (Array.isArray(items)) replace.items = items.map(item => declaredNode(item, false));
  else if (items) replace.items = declaredNode(items, false);
  const patterns = schema.patternProperties as Record<string, SchemaNode> | undefined;
  if (patterns) replace.patternProperties = Object.fromEntries(Object.entries(patterns).map(([key, value]) => [key, declaredNode(value, false)]));
  return Object.keys(replace).length ? copy(schema, replace) : schema;
}

/** The declared schema of a compiled one: the same shape, with `message` in each message field that compiles to text. */
export const declaredSchema = <S extends TSchema>(schema: S) =>
  immutable(Type.Unsafe<Declared<Static<S>>>(declaredNode(schema as SchemaNode, false)));

const isMessageValue = (value: Json): value is Message => typeof value === "object" && value !== null && !Array.isArray(value)
  && Object.keys(value).length === 1 && "key" in value && typeof value.key === "string";

function resolved(value: Json, sentence: (message: Message) => string): Json {
  if (isMessageValue(value)) return sentence(value);
  if (Array.isArray(value)) return value.map(item => resolved(item, sentence));
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolved(item, sentence)]));
}

/** Every message of a declaration replaced by its sentence in the bundle; a key the bundle lacks is MESSAGE_MISSING. */
export function resolveMessages(declaration: unknown, bundle: MessageBundle): Json {
  return resolved(jsonSnapshot(declaration), item => bundle.text(item));
}

/** The declaration with each message's key standing in for its sentence: the structural checks a module runs before any
 * locale is chosen read the shape, never the wording. */
export const keysAsText = (declaration: unknown): Json => resolved(jsonSnapshot(declaration), item => item.key);
