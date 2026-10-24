// Law: the infrastructure DDL is generated from the table declarations, never written by hand.
// The output is idempotent (IF NOT EXISTS) so an installer may apply it on every start.
import type { ColumnCheck, ColumnStorage } from "./columns.ts";
import type { StoredColumn, Table, TableIndex } from "./declare.ts";
import { infrastructureTables } from "./infrastructure.ts";

export const infrastructureDdlPath = "src/storage/generated/infrastructure.sql";
const header = "-- GENERATED from src/storage/infrastructure.ts by `node scripts/storage.ts --write`. Do not edit.\n";

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const list = (names: readonly string[]) => names.join(", ");

function renderCheck(name: string, check: ColumnCheck): string {
  switch (check.kind) {
    case "true": return `CHECK (${name})`;
    case "greater-than": return `CHECK (${name} > ${check.value})`;
    case "at-least": return `CHECK (${name} >= ${check.value})`;
    case "between": return `CHECK (${name} BETWEEN ${check.minimum} AND ${check.maximum})`;
    case "one-of": return `CHECK (${name} IN (${check.values.map(quote).join(", ")}))`;
    case "pattern": return `CHECK (${name} ~ ${quote(check.pattern)})`;
    case "json-object": return `CHECK (jsonb_typeof(${name}) = 'object')`;
  }
}

function renderDefault(value: NonNullable<ColumnStorage["default"]>): string {
  if (value === "clock_timestamp") return "DEFAULT clock_timestamp()";
  return `DEFAULT ${value}`;
}

function renderColumn({ name, storage }: StoredColumn): string {
  return [
    `  ${name} ${storage.type}`,
    ...(storage.identity ? ["GENERATED ALWAYS AS IDENTITY"] : []),
    ...(storage.nullable ? [] : ["NOT NULL"]),
    ...(storage.default === undefined ? [] : [renderDefault(storage.default)]),
    ...(storage.check ? [renderCheck(name, storage.check)] : []),
  ].join(" ");
}

function renderTable(table: Table): string {
  const lines = [
    ...table.columns.map(renderColumn),
    `  PRIMARY KEY (${list(table.primaryKey)})`,
    ...table.unique.map(columns => `  UNIQUE (${list(columns)})`),
    ...table.foreignKeys.map(key => `  FOREIGN KEY (${list(key.columns)}) REFERENCES ${key.references.table.qualifiedName} (${list(key.references.columns)})`),
  ];
  return `CREATE TABLE IF NOT EXISTS ${table.qualifiedName} (\n${lines.join(",\n")}\n);\n`;
}

const renderIndex = (table: Table, index: TableIndex) =>
  `CREATE ${index.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${index.name} ON ${table.qualifiedName} (${list(index.columns)})` +
  `${index.where === undefined ? "" : ` WHERE ${index.where}`};\n`;

export function renderDdl(tables: readonly Table[]): string {
  const namespaces = [...new Set(tables.flatMap(table => table.namespace ? [table.namespace] : []))];
  return header + [
    ...namespaces.map(namespace => `CREATE SCHEMA IF NOT EXISTS ${namespace};\n`),
    ...tables.map(table => renderTable(table) + table.indexes.map(index => renderIndex(table, index)).join("")),
  ].join("");
}

export const renderInfrastructureDdl = () => renderDdl(infrastructureTables);
