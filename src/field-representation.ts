import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { FieldDefinitionSchema, type FieldDefinition } from "./field-definition.ts";

export const FieldRepresentationSchema = Type.Union([Type.Literal("text"), Type.Literal("paragraphs"), Type.Literal("image"), Type.Literal("tags")]);
export type FieldRepresentation = Static<typeof FieldRepresentationSchema>;
export const FieldRepresentationsSchema = Type.Record(Type.String({ minLength: 1 }), FieldRepresentationSchema,
  { additionalProperties: false });
const FieldKindSchema = Type.Index(FieldDefinitionSchema, ["kind"]);
export const FieldKindsSchema = Type.Record(Type.String({ minLength: 1 }), FieldKindSchema, { additionalProperties: false });
export type FieldKind = Static<typeof FieldKindSchema>;

export function supportsFieldRepresentation(fact: Pick<FieldDefinition, "kind">, representation: FieldRepresentation): boolean {
  if (fact.kind === "file") return representation === "image";
  if (fact.kind === "labels") return representation === "tags";
  return representation !== "image" && representation !== "tags" && fact.kind !== "principal" && (representation !== "paragraphs" || fact.kind === "text");
}

export function requireFieldRepresentations(value: unknown, fields: Iterable<string>): asserts value is Record<string, FieldRepresentation> {
  if (!Check(FieldRepresentationsSchema, value)) throw new Error("INVALID_FIELD_REPRESENTATIONS");
  const expected = new Set(fields);
  for (const name of Object.keys(value)) {
    if (!expected.has(name)) throw new Error(`Unknown field representation: ${name}`);
  }
  for (const name of expected) {
    if (!Object.hasOwn(value, name)) throw new Error(`Missing field representation: ${name}`);
  }
}

export function requireFieldKinds(value: unknown, fields: Iterable<string>): asserts value is Record<string, FieldKind> {
  if (!Check(FieldKindsSchema, value)) throw new Error("INVALID_FIELD_KINDS");
  const expected = new Set(fields);
  for (const name of Object.keys(value)) {
    if (!expected.has(name)) throw new Error(`Unknown field kind: ${name}`);
  }
  for (const name of expected) {
    if (!Object.hasOwn(value, name)) throw new Error(`Missing field kind: ${name}`);
  }
}

export function requireFieldPresentation(representations: unknown, kinds: unknown, fields: Iterable<string>) {
  const names = [...fields];
  requireFieldRepresentations(representations, names);
  requireFieldKinds(kinds, names);
  for (const [name, representation] of Object.entries(representations)) {
    if (!supportsFieldRepresentation({ kind: kinds[name]! }, representation)) {
      throw new Error(`Field representation type mismatch: ${name}`);
    }
  }
  return { fieldRepresentations: representations, fieldKinds: kinds };
}

export function requireFieldRepresentation(representations: Readonly<Record<string, FieldRepresentation>>, field: string): FieldRepresentation {
  const representation = Object.hasOwn(representations, field) ? representations[field] : undefined;
  if (!Check(FieldRepresentationSchema, representation)) throw new Error(`INVALID_FIELD_REPRESENTATION: ${field}`);
  return representation;
}
