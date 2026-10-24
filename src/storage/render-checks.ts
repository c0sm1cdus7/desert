// Law: a declared column check has one SQL rendering; identifiers are always quoted, so a fact may be named like a keyword.
// The labels check calls one generated function per namespace, because Postgres forbids subqueries inside CHECK.
import { canonicalLabel } from "../labels.ts";
import type { ColumnCheck } from "./columns.ts";
import type { Table } from "./declare.ts";

/** Declared names are lower-case identifiers (declare.ts), so quoting never needs escaping. */
export const quoted = (name: string) => `"${name}"`;
export const quotedList = (names: readonly string[]) => names.map(quoted).join(", ");
export const qualified = (table: Table) => table.namespace ? `${quoted(table.namespace)}.${quoted(table.name)}` : quoted(table.name);
export const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

const labelsFunction = (namespace: string | undefined) => `${quoted(namespace ?? "public")}.${quoted("desert_labels_valid")}`;

export function renderCheck(table: Table, name: string, check: ColumnCheck): string {
  const column = quoted(name);
  switch (check.kind) {
    case "true": return `CHECK (${column})`;
    case "greater-than": return `CHECK (${column} > ${check.value})`;
    case "at-least": return `CHECK (${column} >= ${check.value})`;
    case "between": return `CHECK (${column} BETWEEN ${check.minimum} AND ${check.maximum})`;
    case "one-of": return `CHECK (${column} IN (${check.values.map(literal).join(", ")}))`;
    case "pattern": return `CHECK (${column} ~ ${literal(check.pattern)})`;
    case "json-object": return `CHECK (jsonb_typeof(${column}) = 'object')`;
    case "length": return `CHECK (${renderLength(column, check.minimum, check.maximum)})`;
    case "labels": return `CHECK (${labelsFunction(table.namespace)}(${column}, ${check.maxItems}, ${check.maxLength}))`;
  }
}

function renderLength(column: string, minimum: number, maximum: number | undefined): string {
  if (maximum === undefined) return `char_length(${column}) >= ${minimum}`;
  if (minimum === 0) return `char_length(${column}) <= ${maximum}`;
  return `char_length(${column}) BETWEEN ${minimum} AND ${maximum}`;
}

/** One-dimensional, at most max_items distinct non-null labels, each canonical (src/labels.ts) and at most max_length long.
 * Postgres reads the label pattern with the same meaning for ASCII; it treats fewer Unicode spaces as whitespace, so it is
 * never stricter than the application. STRICT: a NULL array (a nullable column) passes, as CHECK does. */
export function renderLabelsFunction(namespace: string | undefined): string {
  return `CREATE OR REPLACE FUNCTION ${labelsFunction(namespace)}(labels text[], max_items integer, max_length integer) RETURNS boolean
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT coalesce(array_ndims(labels), 1) = 1 AND cardinality(labels) <= max_items
    AND cardinality(labels) = (SELECT count(DISTINCT label) FROM unnest(labels) AS label)
    AND NOT EXISTS (SELECT 1 FROM unnest(labels) AS label
      WHERE label IS NULL OR char_length(label) > max_length OR label !~ ${literal(canonicalLabel)})
$$;
`;
}

export const usesLabelsFunction = (table: Table) => table.columns.some(column => column.storage.check?.kind === "labels");
