// Law: an infrastructure table is declared once, as a closed TypeBox row plus its keys and indexes;
// the DDL and the TypeScript row type are derived from it. Raises STORAGE_DECLARATION.
import type { TObject } from "@sinclair/typebox";
import { readColumnStorage, type ColumnStorage } from "./columns.ts";

type ColumnName<R extends TObject> = Extract<keyof R["properties"], string>;
export type StoredColumn = Readonly<{ name: string; storage: ColumnStorage }>;
export type TableReference = Readonly<{ table: Table; columns: readonly string[] }>;
export type TableIndex<C extends string = string> = Readonly<{ name: string; columns: readonly C[]; unique?: true; where?: C }>;
export type TableDeclaration<R extends TObject> = Readonly<{
  /** Absent means the database's default schema. */
  namespace?: "desert_execution";
  name: string;
  row: R;
  primaryKey: readonly ColumnName<R>[];
  unique?: readonly (readonly ColumnName<R>[])[];
  foreignKeys?: readonly Readonly<{ columns: readonly ColumnName<R>[]; references: TableReference }>[];
  indexes?: readonly TableIndex<ColumnName<R>>[];
}>;
export type Table<R extends TObject = TObject> = Readonly<{
  namespace?: "desert_execution";
  name: string;
  qualifiedName: string;
  row: R;
  columns: readonly StoredColumn[];
  primaryKey: readonly string[];
  unique: readonly (readonly string[])[];
  foreignKeys: readonly Readonly<{ columns: readonly string[]; references: TableReference }>[];
  indexes: readonly TableIndex[];
}>;

const identifier = /^[a-z_][a-z0-9_]{0,62}$/;
const fail = (where: string, what: string): never => {
  throw new Error(`STORAGE_DECLARATION: ${where}: ${what}; contract: src/storage/declare.ts`);
};
const sameSet = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every(name => right.includes(name));

/** A foreign key target: the named columns of a declared table. */
export function references<R extends TObject>(table: Table<R>, ...columns: ColumnName<R>[]): TableReference {
  return Object.freeze({ table, columns: Object.freeze([...columns]) });
}

export function defineTable<R extends TObject>(declaration: TableDeclaration<R>): Table<R> {
  const qualifiedName = declaration.namespace ? `${declaration.namespace}.${declaration.name}` : declaration.name;
  if (!identifier.test(declaration.name)) fail(qualifiedName, "table name is not a lower-case SQL identifier");
  if (declaration.row.additionalProperties !== false) fail(qualifiedName, "row must be closed (additionalProperties: false)");
  const required = declaration.row.required ?? [];
  const columns = Object.entries(declaration.row.properties).map(([name, schema]) => {
    const where = `${qualifiedName}.${name}`;
    if (!identifier.test(name)) fail(where, "column name is not a lower-case SQL identifier");
    if (!required.includes(name)) fail(where, "column is optional; a nullable column is nullable(column.*), never Type.Optional");
    return Object.freeze({ name, storage: readColumnStorage(schema, where) });
  });
  const column = (name: string, where: string) => columns.find(entry => entry.name === name) ?? fail(where, `unknown column ${name}`);
  const requireColumns = (names: readonly string[], where: string) => {
    if (!names.length || new Set(names).size !== names.length) fail(where, "column list is empty or repeats a column");
    return names.map(name => column(name, where));
  };
  for (const key of requireColumns(declaration.primaryKey, `${qualifiedName} primary key`)) {
    if (key.storage.nullable) fail(`${qualifiedName}.${key.name}`, "primary key column is nullable");
  }
  for (const unique of declaration.unique ?? []) requireColumns(unique, `${qualifiedName} unique`);
  for (const foreignKey of declaration.foreignKeys ?? []) assertForeignKey(qualifiedName, requireColumns(foreignKey.columns, `${qualifiedName} foreign key`), foreignKey.references);
  for (const index of declaration.indexes ?? []) {
    if (!identifier.test(index.name)) fail(qualifiedName, `index name ${index.name} is not a lower-case SQL identifier`);
    requireColumns(index.columns, `${qualifiedName} index ${index.name}`);
    if (index.where !== undefined && column(index.where, index.name).storage.type !== "boolean") {
      fail(`${qualifiedName} index ${index.name}`, "a partial index predicate must be a boolean column");
    }
  }
  return Object.freeze({
    ...(declaration.namespace ? { namespace: declaration.namespace } : {}),
    name: declaration.name, qualifiedName, row: declaration.row, columns: Object.freeze(columns),
    primaryKey: declaration.primaryKey, unique: declaration.unique ?? [], foreignKeys: declaration.foreignKeys ?? [],
    indexes: declaration.indexes ?? [],
  });
}

function assertForeignKey(qualifiedName: string, local: readonly StoredColumn[], target: TableReference) {
  const where = `${qualifiedName} foreign key (${local.map(entry => entry.name).join(", ")})`;
  const keys = [target.table.primaryKey, ...target.table.unique];
  if (!keys.some(key => sameSet(key, target.columns))) fail(where, `${target.table.qualifiedName}(${target.columns.join(", ")}) is not a key of the target`);
  if (local.length !== target.columns.length) fail(where, "column count differs from the referenced key");
  local.forEach((entry, position) => {
    const referenced = target.table.columns.find(candidate => candidate.name === target.columns[position]);
    if (referenced?.storage.type !== entry.storage.type) fail(where, `${entry.name} is ${entry.storage.type}, the referenced column is ${referenced?.storage.type}`);
  });
}

/** The ordered declaration list: names are unique and every foreign key points to a table declared before it. */
export function declareStorage<const T extends readonly Table[]>(tables: T): T {
  tables.forEach((table, position) => {
    const earlier = tables.slice(0, position);
    if (earlier.some(other => other.qualifiedName === table.qualifiedName)) fail(table.qualifiedName, "table is declared twice");
    for (const foreignKey of table.foreignKeys) {
      if (!earlier.includes(foreignKey.references.table)) {
        fail(table.qualifiedName, `references ${foreignKey.references.table.qualifiedName}, which is not declared before it`);
      }
    }
  });
  return Object.freeze(tables);
}
