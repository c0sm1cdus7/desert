// Law: DDL is generated from the table declarations, never written by hand.
// The output is idempotent (IF NOT EXISTS, OR REPLACE) so an installer may apply it on every start.
import { createHash } from "node:crypto";
import type { InstallationLanguage } from "./client-installation.ts";
import type { ColumnStorage } from "./columns.ts";
import type { RowLimit, StoredColumn, TableIndex, TableShape } from "./declare.ts";
import { controllerTables, executionTables, infrastructureTables } from "./infrastructure.ts";
import { languageCollation, renderLanguageCollation, renderSearchSupport, usesLanguageCollation } from "./render-language.ts";
import { literal, qualified, quoted, quotedList, renderCheck, renderLabelsFunction, usesLabelsFunction } from "./render-checks.ts";

export const infrastructureDdlPath = "src/storage/generated/infrastructure.sql";
const infrastructureHeader = "-- GENERATED from src/storage/infrastructure.ts by `node scripts/storage.ts --write`. Do not edit.\n";

export function renderDefault(value: NonNullable<ColumnStorage["default"]>): string {
  if (value === "clock_timestamp") return "DEFAULT clock_timestamp()";
  return `DEFAULT ${value}`;
}

export function renderColumn(table: TableShape, { name, storage }: StoredColumn): string {
  return [
    `  ${quoted(name)} ${storage.type}`,
    ...(storage.collation ? [`COLLATE ${languageCollation(table)}`] : []),
    ...(storage.identity ? ["GENERATED ALWAYS AS IDENTITY"] : []),
    ...(storage.nullable ? [] : ["NOT NULL"]),
    ...(storage.default === undefined ? [] : [renderDefault(storage.default)]),
    ...(storage.check ? [renderCheck(table, name, storage.check)] : []),
  ].join(" ");
}

export function renderTable(table: TableShape): string {
  const lines = [
    ...table.columns.map(column => renderColumn(table, column)),
    `  PRIMARY KEY (${quotedList(table.primaryKey)})`,
    ...table.unique.map(columns => `  UNIQUE (${quotedList(columns)})`),
    ...table.foreignKeys.map(key => `  FOREIGN KEY (${quotedList(key.columns)}) REFERENCES ${qualified(key.references.table)} (${quotedList(key.references.columns)})`),
  ];
  return `CREATE TABLE IF NOT EXISTS ${qualified(table)} (\n${lines.join(",\n")}\n);\n`;
}

export const renderIndex = (table: TableShape, index: TableIndex) =>
  `CREATE ${index.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${quoted(index.name)} ON ${qualified(table)} (${quotedList(index.columns)})` +
  `${index.where === undefined ? "" : ` WHERE ${quoted(index.where)}`};\n`;

/** Locks the referenced row first, so concurrent inserts for one parent are counted one after the other. NOT DEFERRABLE:
 * an action's changes apply in their declared order, each statement leaving the declaration true (owner answer Q3). */
export function renderLimit(table: TableShape, limit: RowLimit): string {
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
CREATE CONSTRAINT TRIGGER ${quoted(name)} AFTER INSERT OR UPDATE ON ${qualified(table)} NOT DEFERRABLE FOR EACH ROW EXECUTE FUNCTION ${trigger}();
`;
}

/** `language` is the installation's (owner answer Q20); tables with a collated column cannot be rendered without it. */
export function renderDdl(header: string, tables: readonly TableShape[], language?: InstallationLanguage): string {
  const namespaces = [...new Set(tables.map(table => table.namespace))];
  const collated = namespaces.filter(namespace => tables.some(table => table.namespace === namespace && usesLanguageCollation(table)));
  return header + [
    ...namespaces.flatMap(namespace => namespace === undefined ? [] : [`CREATE SCHEMA IF NOT EXISTS ${quoted(namespace)};\n`]),
    ...collated.map(namespace => renderLanguageCollation(namespace, language)),
    ...namespaces.filter(namespace => tables.some(table => table.namespace === namespace && usesLabelsFunction(table))).map(renderLabelsFunction),
    ...tables.map(table => renderTable(table) + table.indexes.map(index => renderIndex(table, index)).join("") +
      table.limits.map(limit => renderLimit(table, limit)).join("")),
  ].join("");
}

/** The infrastructure of every client database, with the accent-insensitive search support (owner answer Q20). */
export const renderInfrastructureDdl = () => renderDdl(infrastructureHeader, infrastructureTables) + renderSearchSupport();
/** What the controller installer applies (src/local/database.ts): its group of the same declarations, and the search support. */
export const renderControllerDdl = () =>
  renderDdl("-- GENERATED from src/storage/infrastructure.ts (controller tables). Do not edit.\n", controllerTables) + renderSearchSupport();
/** What the host's execution queue applies (src/execution/queue.ts). */
export const renderExecutionDdl = () =>
  renderDdl("-- GENERATED from src/storage/infrastructure.ts (execution tables). Do not edit.\n", executionTables);

/** A new, empty client database (owner answer Q4: the database is the client installation). */
export function renderCreateDatabase(name: string): string {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(name)) throw new Error(`STORAGE_DECLARATION: database ${name} is not a lower-case SQL identifier; contract: src/storage/render-ddl.ts`);
  return `CREATE DATABASE ${quoted(name)}`;
}

let infrastructure: string | undefined;
/** sha256 of the generated infrastructure DDL: what desert_installation.infrastructure_digest records, so a database built
 * from other infrastructure tables refuses to serve (INSTALLATION_MISMATCH) instead of a hand-bumped schema version. */
export const infrastructureDigest = () => infrastructure ??= createHash("sha256").update(renderInfrastructureDdl()).digest("hex");
