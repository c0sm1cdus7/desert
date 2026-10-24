// Law: DDL is generated from the table declarations, never written by hand.
// The output is idempotent (IF NOT EXISTS, OR REPLACE) so an installer may apply it on every start.
import type { ColumnStorage } from "./columns.ts";
import type { RowLimit, StoredColumn, Table, TableIndex } from "./declare.ts";
import { infrastructureTables } from "./infrastructure.ts";
import { literal, qualified, quoted, quotedList, renderCheck, renderLabelsFunction, usesLabelsFunction } from "./render-checks.ts";

export const infrastructureDdlPath = "src/storage/generated/infrastructure.sql";
const infrastructureHeader = "-- GENERATED from src/storage/infrastructure.ts by `node scripts/storage.ts --write`. Do not edit.\n";

function renderDefault(value: NonNullable<ColumnStorage["default"]>): string {
  if (value === "clock_timestamp") return "DEFAULT clock_timestamp()";
  return `DEFAULT ${value}`;
}

function renderColumn(table: Table, { name, storage }: StoredColumn): string {
  return [
    `  ${quoted(name)} ${storage.type}`,
    ...(storage.identity ? ["GENERATED ALWAYS AS IDENTITY"] : []),
    ...(storage.nullable ? [] : ["NOT NULL"]),
    ...(storage.default === undefined ? [] : [renderDefault(storage.default)]),
    ...(storage.check ? [renderCheck(table, name, storage.check)] : []),
  ].join(" ");
}

function renderTable(table: Table): string {
  const lines = [
    ...table.columns.map(column => renderColumn(table, column)),
    `  PRIMARY KEY (${quotedList(table.primaryKey)})`,
    ...table.unique.map(columns => `  UNIQUE (${quotedList(columns)})`),
    ...table.foreignKeys.map(key => `  FOREIGN KEY (${quotedList(key.columns)}) REFERENCES ${qualified(key.references.table)} (${quotedList(key.references.columns)})`),
  ];
  return `CREATE TABLE IF NOT EXISTS ${qualified(table)} (\n${lines.join(",\n")}\n);\n`;
}

const renderIndex = (table: Table, index: TableIndex) =>
  `CREATE ${index.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${quoted(index.name)} ON ${qualified(table)} (${quotedList(index.columns)})` +
  `${index.where === undefined ? "" : ` WHERE ${quoted(index.where)}`};\n`;

/** Locks the referenced row first, so concurrent inserts for one parent are counted one after the other. */
function renderLimit(table: Table, limit: RowLimit): string {
  const name = `${table.name}_${limit.column}_limit`;
  const parent = table.foreignKeys.find(key => key.columns.length === 1 && key.columns[0] === limit.column)?.references;
  if (!parent) throw new Error(`STORAGE_DECLARATION: ${table.qualifiedName}: limit on ${limit.column} has no foreign key; contract: src/storage/declare.ts`);
  const trigger = `${table.namespace ? `${quoted(table.namespace)}.` : ""}${quoted(name)}`;
  const column = quoted(limit.column);
  const message = `STORAGE_MAX_ITEMS: ${table.qualifiedName}: more than ${limit.maximum} rows for ${limit.column} %`;
  return `CREATE OR REPLACE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM ${qualified(parent.table)} WHERE ${quotedList(parent.columns)} = NEW.${column} FOR NO KEY UPDATE;
  IF (SELECT count(*) FROM ${qualified(table)} WHERE ${column} = NEW.${column}) > ${limit.maximum} THEN
    RAISE EXCEPTION ${literal(message)}, NEW.${column}
      USING ERRCODE = 'check_violation', CONSTRAINT = ${literal(name)}, SCHEMA = ${literal(table.namespace ?? "public")}, TABLE = ${literal(table.name)};
  END IF;
  RETURN NULL;
END
$$;
DROP TRIGGER IF EXISTS ${quoted(name)} ON ${qualified(table)};
CREATE CONSTRAINT TRIGGER ${quoted(name)} AFTER INSERT OR UPDATE ON ${qualified(table)} ${renderTiming(limit.timing)} FOR EACH ROW EXECUTE FUNCTION ${trigger}();
`;
}

function renderTiming(timing: RowLimit["timing"]): string {
  switch (timing) {
    case "immediate": return "NOT DEFERRABLE";
  }
}

export function renderDdl(header: string, tables: readonly Table[]): string {
  const namespaces = [...new Set(tables.map(table => table.namespace))];
  return header + [
    ...namespaces.flatMap(namespace => namespace === undefined ? [] : [`CREATE SCHEMA IF NOT EXISTS ${quoted(namespace)};\n`]),
    ...namespaces.filter(namespace => tables.some(table => table.namespace === namespace && usesLabelsFunction(table))).map(renderLabelsFunction),
    ...tables.map(table => renderTable(table) + table.indexes.map(index => renderIndex(table, index)).join("") +
      table.limits.map(limit => renderLimit(table, limit)).join("")),
  ].join("");
}

export const renderInfrastructureDdl = () => renderDdl(infrastructureHeader, infrastructureTables);
