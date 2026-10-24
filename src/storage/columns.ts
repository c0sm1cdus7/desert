// Law: a stored column is one TypeBox schema; its SQL type, nullability, default and check travel with it.
// The `storage` annotation is written only by these builders and read back only through ColumnStorageSchema.
import { Type, type Static, type TLiteral, type TNull, type TSchema, type TUnion } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const closed = { additionalProperties: false } as const;
const literals = <const V extends readonly [string, ...string[]]>(values: V) => Type.Union(values.map(value => Type.Literal(value)));

export const SqlTypeSchema = literals(["uuid", "text", "integer", "bigint", "boolean", "timestamptz", "jsonb", "text[]"]);
export const ColumnCheckSchema = Type.Union([
  Type.Object({ kind: Type.Literal("true") }, closed),
  Type.Object({ kind: Type.Literal("greater-than"), value: Type.Integer() }, closed),
  Type.Object({ kind: Type.Literal("at-least"), value: Type.Integer() }, closed),
  Type.Object({ kind: Type.Literal("between"), minimum: Type.Integer(), maximum: Type.Integer() }, closed),
  Type.Object({ kind: Type.Literal("one-of"), values: Type.Array(Type.String(), { minItems: 1 }) }, closed),
  Type.Object({ kind: Type.Literal("pattern"), pattern: Type.String({ minLength: 1 }) }, closed),
  Type.Object({ kind: Type.Literal("json-object") }, closed),
]);
export const ColumnDefaultSchema = Type.Union([Type.Boolean(), Type.Integer(), Type.Literal("clock_timestamp")]);
export const ColumnStorageSchema = Type.Object({
  type: SqlTypeSchema,
  nullable: Type.Boolean(),
  default: Type.Optional(ColumnDefaultSchema),
  identity: Type.Optional(Type.Literal("always")),
  check: Type.Optional(ColumnCheckSchema),
}, closed);
export type ColumnStorage = Static<typeof ColumnStorageSchema>;
export type ColumnCheck = Static<typeof ColumnCheckSchema>;

/** Postgres prints a uuid in this one lower-case form. */
export const uuidPattern = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
const bigintPattern = "^-?[0-9]+$";

type IntegerBounds = Readonly<{ exclusiveMinimum: number } | { minimum: number } | { minimum: number; maximum: number }>;
function integerCheck(bounds: IntegerBounds): ColumnCheck {
  if ("exclusiveMinimum" in bounds) return { kind: "greater-than", value: bounds.exclusiveMinimum };
  if ("maximum" in bounds) return { kind: "between", minimum: bounds.minimum, maximum: bounds.maximum };
  return { kind: "at-least", value: bounds.minimum };
}
const withCheck = (check: ColumnCheck | undefined) => check ? { check } : {};
const withDefault = (value: ColumnStorage["default"]) => value === undefined ? {} : { default: value };

export const column = {
  uuid: () => Type.String({ pattern: uuidPattern, storage: { type: "uuid", nullable: false } }),
  text: (options: Readonly<{ pattern?: string }> = {}) => options.pattern === undefined
    ? Type.String({ storage: { type: "text", nullable: false } })
    : Type.String({ pattern: options.pattern, storage: { type: "text", nullable: false, check: { kind: "pattern", pattern: options.pattern } } }),
  /** A closed set stored as text with an IN check; the TypeScript union is the same list. */
  oneOf: <const V extends readonly [string, ...string[]]>(values: V): TUnion<TLiteral<V[number]>[]> =>
    Type.Union(values.map(value => Type.Literal(value)), { storage: { type: "text", nullable: false, check: { kind: "one-of", values: [...values] } } }),
  integer: (bounds?: IntegerBounds, initial?: number) => Type.Integer({ ...bounds,
    storage: { type: "integer", nullable: false, ...withCheck(bounds && integerCheck(bounds)), ...withDefault(initial) } }),
  /** pg returns int8 as a decimal string; the row type says so instead of pretending it is a number. */
  bigint: (bounds?: Readonly<{ exclusiveMinimum: number }>) => Type.String({ pattern: bigintPattern,
    storage: { type: "bigint", nullable: false, ...withCheck(bounds && integerCheck(bounds)) } }),
  identity: () => Type.String({ pattern: bigintPattern, storage: { type: "bigint", nullable: false, identity: "always" } }),
  boolean: (initial?: boolean) => Type.Boolean({ storage: { type: "boolean", nullable: false, ...withDefault(initial) } }),
  /** A one-row table: the key can only be true. */
  singleton: (initial?: true) => Type.Literal(true, { storage: { type: "boolean", nullable: false, check: { kind: "true" }, ...withDefault(initial) } }),
  timestamp: (initial?: "clock_timestamp") => Type.Date({ storage: { type: "timestamptz", nullable: false, ...withDefault(initial) } }),
  textArray: () => Type.Array(Type.String(), { storage: { type: "text[]", nullable: false } }),
  /** jsonb holding a value of `schema`; `object` adds the jsonb_typeof check. */
  json: <S extends TSchema>(schema: S, shape: Readonly<{ object?: true }> = {}): S =>
    ({ ...schema, storage: { type: "jsonb", nullable: false, ...withCheck(shape.object ? { kind: "json-object" } : undefined) } }),
} as const;

/** The same column, also accepting SQL NULL. */
export function nullable<S extends TSchema>(schema: S): TUnion<[S, TNull]> {
  return Type.Union([schema, Type.Null()], { storage: { ...readColumnStorage(schema, "nullable()"), nullable: true } });
}

export function readColumnStorage(schema: TSchema, where: string): ColumnStorage {
  const storage: unknown = schema["storage"];
  if (!isColumnStorage(storage)) {
    throw new Error(`STORAGE_DECLARATION: ${where}: property is not a storage column; declare it with column.* from src/storage/columns.ts`);
  }
  return storage;
}
const isColumnStorage = (value: unknown): value is ColumnStorage => Value.Check(ColumnStorageSchema, value);
