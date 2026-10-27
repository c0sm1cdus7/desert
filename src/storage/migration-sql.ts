// The statements a generated migration uses beyond the DDL renderer's: constraints are found by what they constrain, not
// by a guessed name, and every added constraint is left for Postgres to name, so a migrated database names it exactly as
// a fresh install of the new declaration does.
import type { ColumnCheck, ColumnStorage } from "./columns.ts";
import type { RowLimit, TableShape } from "./declare.ts";
import type { FillValue } from "./migration-decisions.ts";
import { literal, qualified, quoted, quotedList, renderCheck } from "./render-checks.ts";

const attributes = (table: TableShape, columns: readonly string[]) =>
  `(SELECT array_agg(attnum) FROM pg_attribute WHERE attrelid = ${literal(qualified(table))}::regclass AND attname = ANY (ARRAY[${columns.map(literal).join(", ")}]))`;

/** Drops the one constraint of `type` ('c' check, 'u' unique) on exactly these columns; none or several fail loud. */
function dropConstraint(table: TableShape, type: "c" | "u", columns: readonly string[]): string {
  return `DO $$
DECLARE found text;
BEGIN
  SELECT conname INTO STRICT found FROM pg_constraint
    WHERE conrelid = ${literal(qualified(table))}::regclass AND contype = '${type}'
      AND conkey @> ${attributes(table, columns)} AND conkey <@ ${attributes(table, columns)};
  EXECUTE format('ALTER TABLE ${qualified(table).replaceAll("'", "''")} DROP CONSTRAINT %I', found);
END
$$;
`;
}

export const dropCheck = (table: TableShape, column: string) => dropConstraint(table, "c", [column]);
export const addCheck = (table: TableShape, column: string, check: ColumnCheck) => `ALTER TABLE ${qualified(table)} ADD ${renderCheck(table, column, check)};\n`;
export const dropUnique = (table: TableShape, columns: readonly string[]) => dropConstraint(table, "u", columns);
export const addUnique = (table: TableShape, columns: readonly string[]) => `ALTER TABLE ${qualified(table)} ADD UNIQUE (${quotedList(columns)});\n`;
export const alterColumn = (table: TableShape, column: string, change: string) => `ALTER TABLE ${qualified(table)} ALTER COLUMN ${quoted(column)} ${change};\n`;
export const bumpVersion = (table: TableShape) => `UPDATE ${qualified(table)} SET "version" = "version" + 1;\n`;
export const limitFunction = (table: TableShape, limit: RowLimit) =>
  `${table.namespace ? `${quoted(table.namespace)}.` : ""}${quoted(`${table.name}_${limit.column}_limit`)}`;

/** A typed SQL literal of a fill value; the column's own checks still decide whether it is valid. */
export function fillLiteral(storage: ColumnStorage, value: FillValue, where: string): string {
  const fail = (): never => {
    throw new Error(`MIGRATION_DECISION: ${where}: fill value ${JSON.stringify(value)} is not a ${storage.type}; contract: src/storage/migration-decisions.ts`);
  };
  switch (storage.type) {
    case "text": case "uuid": return typeof value === "string" ? `${literal(value)}::${storage.type}` : fail();
    case "bigint": case "integer": return typeof value === "number" && Number.isSafeInteger(value) ? `${value}::${storage.type}` : fail();
    case "boolean": return typeof value === "boolean" ? String(value) : fail();
    case "text[]": return Array.isArray(value) ? `ARRAY[${value.map(literal).join(", ")}]::text[]` : fail();
    default: return fail();
  }
}

/** A narrower row limit holds for the rows already stored before the trigger takes over. */
export function validateLimit(table: TableShape, limit: RowLimit): string {
  const message = `STORAGE_MAX_ITEMS: ${table.qualifiedName}: more than ${limit.maximum} rows for ${limit.column}`;
  return `DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM ${qualified(table)} GROUP BY ${quoted(limit.column)} HAVING count(*) > ${limit.maximum}) THEN
    RAISE EXCEPTION ${literal(message)} USING ERRCODE = 'check_violation', CONSTRAINT = ${literal(`${table.name}_${limit.column}_limit`)};
  END IF;
END
$$;
`;
}
