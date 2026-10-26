// Law: a fact's declaration is its storage; this is the one mapping FieldDefinition → column (plan §15, step 7.1).
// Owner answer Q1: every fact is one typed column of its own kind; there is no free JSON drawer (factColumn refuses jsonb).
// A text fact orders by the installation's language (Q20). A reference fact is not a column: it becomes a join table
// `<object>_<fact>` (src/storage/ddl.ts). Raises STORAGE_DECLARATION.
import type { TSchema } from "@sinclair/typebox";
import type { FieldDefinition } from "../field-definition.ts";
import { column, inInstallationLanguage, readColumnStorage } from "./columns.ts";
import type { Table } from "./declare.ts";
import { assetsTable } from "./tables/assets.ts";
import { identitiesTable } from "./tables/local.ts";

export type FactStorage =
  | Readonly<{ kind: "column"; schema: TSchema; references?: Table }>
  | Readonly<{ kind: "join"; target: string; maxItems: number }>;

/** Q1: a fact column is typed. Every FieldDefinition kind is required today (src/schema.ts emitObject), so every fact
 * column is NOT NULL; an optional fact (slice 9) is nullable(column.*) of the same type, never a jsonb value. */
export function factColumn<S extends TSchema>(where: string, schema: S): S {
  const storage = readColumnStorage(schema, where);
  if (storage.type === "jsonb") {
    throw new Error(`STORAGE_DECLARATION: ${where}: a fact is one typed column, never a jsonb drawer (owner answer Q1); contract: src/storage/fact-columns.ts`);
  }
  return schema;
}

export function factStorage(where: string, field: FieldDefinition): FactStorage {
  const stored = (schema: TSchema, references?: Table): FactStorage =>
    ({ kind: "column", schema: factColumn(where, schema), ...(references ? { references } : {}) });
  switch (field.kind) {
    case "text": return stored(inInstallationLanguage(column.boundedText(field)));
    case "integer": return stored(column.bigint({
      minimum: field.minimum ?? Number.MIN_SAFE_INTEGER, maximum: field.maximum ?? Number.MAX_SAFE_INTEGER }));
    case "enum": return stored(enumColumn(field.values));
    case "principal": return stored(column.uuid(), identitiesTable);
    // The asset's media kind lives on its asset row; slice 7.4 turns `asset` into the `file` object kind.
    case "asset": return stored(column.uuid(), assetsTable);
    case "labels": return field.reference
      ? { kind: "join", target: field.reference.object, maxItems: field.maxItems }
      : stored(inInstallationLanguage(column.labels(field)));
  }
}

function enumColumn(values: readonly string[]): TSchema {
  const [first, ...rest] = values;
  if (first === undefined) throw new Error("STORAGE_DECLARATION: enum: no values; contract: src/field-definition.ts");
  return column.oneOf([first, ...rest]);
}
