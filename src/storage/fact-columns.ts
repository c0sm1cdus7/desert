// Law: a fact's declaration is its storage; this is the one mapping FieldDefinition → column (plan §15, step 7.1).
// A reference fact is not a column: it becomes a join table `<object>_<fact>` (src/storage/ddl.ts).
import type { TSchema } from "@sinclair/typebox";
import type { FieldDefinition } from "../field-definition.ts";
import { column } from "./columns.ts";
import { factColumn } from "./assumptions.ts";
import type { Table } from "./declare.ts";
import { assetsTable } from "./tables/assets.ts";
import { identitiesTable } from "./tables/local.ts";

export type FactStorage =
  | Readonly<{ kind: "column"; schema: TSchema; references?: Table }>
  | Readonly<{ kind: "join"; target: string; maxItems: number }>;

/** Every FieldDefinition kind is required today (src/schema.ts emitObject lists every fact as required). */
const sparse = false;
const stored = (schema: TSchema, references?: Table): FactStorage =>
  ({ kind: "column", schema: factColumn(schema, sparse), ...(references ? { references } : {}) });

export function factStorage(field: FieldDefinition): FactStorage {
  switch (field.kind) {
    case "text": return stored(column.boundedText(field));
    case "integer": return stored(column.bigint({
      minimum: field.minimum ?? Number.MIN_SAFE_INTEGER, maximum: field.maximum ?? Number.MAX_SAFE_INTEGER }));
    case "enum": return stored(enumColumn(field.values));
    case "principal": return stored(column.uuid(), identitiesTable);
    // The asset's media kind lives on its asset row; slice 7.4 turns `asset` into the `file` object kind.
    case "asset": return stored(column.uuid(), assetsTable);
    case "labels": return field.reference
      ? { kind: "join", target: field.reference.object, maxItems: field.maxItems }
      : stored(column.labels(field));
  }
}

function enumColumn(values: readonly string[]): TSchema {
  const [first, ...rest] = values;
  if (first === undefined) throw new Error("STORAGE_DECLARATION: enum: no values; contract: src/field-definition.ts");
  return column.oneOf([first, ...rest]);
}
