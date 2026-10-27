// The column half of a migration plan: what one kept table's columns need. Widening is automatic (a nullable or defaulted
// column, a wider enum, length, range or label limit, a dropped check); anything that could lose or reject stored data
// takes a decision (src/storage/migration-decisions.ts). An object whose stored values change moves to a new version once.
import { isDeepStrictEqual } from "node:util";
import type { ColumnCheck } from "./columns.ts";
import type { StoredColumn, TableShape } from "./declare.ts";
import { decisionRequired, type ChangeSite, type DecisionBook } from "./migration-decisions.ts";
import { addCheck, alterColumn, bumpVersion, dropCheck, fillLiteral } from "./migration-sql.ts";
import { literal, qualified, quoted } from "./render-checks.ts";
import { renderColumn, renderDefault } from "./render-ddl.ts";

/** Statements by phase; the plan concatenates every table's phases in this order. */
export type Phases = Readonly<{ prepare: string[]; dropConstraints: string[]; dropJoins: string[]; dropColumns: string[];
  dropTables: string[]; createTables: string[]; addColumns: string[]; alterColumns: string[]; addConstraints: string[];
  bump: string[]; cleanup: string[] }>;
export const phases = (): Phases => ({ prepare: [], dropConstraints: [], dropJoins: [], dropColumns: [], dropTables: [],
  createTables: [], addColumns: [], alterColumns: [], addConstraints: [], bump: [], cleanup: [] });

type Interval = Readonly<{ low: number; high: number }>;
function interval(check: ColumnCheck): Interval | undefined {
  switch (check.kind) {
    case "greater-than": return { low: check.value + 1, high: Infinity };
    case "at-least": return { low: check.value, high: Infinity };
    case "between": return { low: check.minimum, high: check.maximum };
    default: return undefined;
  }
}

/** True when every value the old check admits, the new one admits too. */
export function widens(old: ColumnCheck | undefined, next: ColumnCheck | undefined): boolean {
  if (next === undefined || isDeepStrictEqual(old, next)) return true;
  if (old === undefined) return false;
  if (old.kind === "one-of" && next.kind === "one-of") return old.values.every(value => next.values.includes(value));
  if (old.kind === "length" && next.kind === "length") {
    return next.minimum <= old.minimum && (next.maximum === undefined || (old.maximum !== undefined && next.maximum >= old.maximum));
  }
  if (old.kind === "labels" && next.kind === "labels") return next.maxItems >= old.maxItems && next.maxLength >= old.maxLength;
  const [before, after] = [interval(old), interval(next)];
  return before !== undefined && after !== undefined && after.low <= before.low && after.high >= before.high;
}

const isObjectTable = (table: TableShape) => table.columns.some(column => column.name === "version");

/** One kept column whose storage changed. `version` is appended to an UPDATE that rewrites some rows, so exactly the
 * objects whose stored values change move to a new version (empty when every row moves once anyway, or for a join). */
function changeColumn(out: Phases, table: TableShape, site: ChangeSite, old: StoredColumn, next: StoredColumn, book: DecisionBook, version: string) {
  const [before, after] = [old.storage, next.storage];
  const kind = (storage: typeof before) => `${storage.type}${storage.identity ? " identity" : ""}${storage.collation ? " collated" : ""}`;
  if (kind(before) !== kind(after)) {
    decisionRequired(site, `changes kind (${kind(before)} → ${kind(after)}); a stored value never changes kind`, "a new fact, and drop: { field, approvedBy } for this one");
  }
  if (before.nullable && !after.nullable) {
    const fill = book.fill(site);
    if (fill) {
      out.alterColumns.push(`UPDATE ${qualified(table)} SET ${quoted(next.name)} = ${fillLiteral(after, fill.value, `${table.qualifiedName}.${next.name}`)}${version} WHERE ${quoted(next.name)} IS NULL;\n`);
    } else if (!book.narrow(site)) decisionRequired(site, "becomes required", "fill: { field, value, approvedBy } or narrow: { field, approvedBy }");
    out.alterColumns.push(alterColumn(table, next.name, "SET NOT NULL"));
  } else if (!before.nullable && after.nullable) out.alterColumns.push(alterColumn(table, next.name, "DROP NOT NULL"));
  if (!isDeepStrictEqual(before.default, after.default)) {
    out.alterColumns.push(alterColumn(table, next.name, after.default === undefined ? "DROP DEFAULT" : `SET ${renderDefault(after.default)}`));
  }
  if (isDeepStrictEqual(before.check, after.check)) return;
  if (before.check?.kind === "one-of" && after.check?.kind === "one-of" && !widens(before.check, after.check)) {
    const kept = after.check.values, removed = before.check.values.filter(value => !kept.includes(value));
    const mapped = book.migrations(site);
    for (const value of removed) {
      if (!mapped.has(value)) decisionRequired(site, `narrows the enum: removes ${JSON.stringify(value)}`, `migrate: { field, from: ${JSON.stringify(value)}, to: <a kept value> }`);
    }
    for (const [from, to] of mapped) {
      if (!removed.includes(from) || !kept.includes(to)) {
        throw new Error(`MIGRATION_DECISION: ${table.qualifiedName}.${next.name}: migrate ${JSON.stringify(from)} → ${JSON.stringify(to)} must map a removed value to a kept one; contract: src/storage/migration-decisions.ts`);
      }
    }
    out.alterColumns.push(dropCheck(table, old.name));
    for (const [from, to] of mapped) out.alterColumns.push(`UPDATE ${qualified(table)} SET ${quoted(next.name)} = ${literal(to)}${version} WHERE ${quoted(next.name)} = ${literal(from)};\n`);
    out.alterColumns.push(addCheck(table, next.name, after.check));
    return;
  }
  if (!widens(before.check, after.check) && !book.narrow(site)) {
    decisionRequired(site, "narrows what the column admits; stored rows outside it would be rejected", "narrow: { field, approvedBy }");
  }
  if (before.check) out.alterColumns.push(dropCheck(table, old.name));
  if (after.check) out.alterColumns.push(addCheck(table, next.name, after.check));
}

/** The columns of a table both models hold. `siteOf` names a column's declared site for decisions; `bumped` is true when
 * the plan already moves every object of this table to a new version (a reference fact of it was dropped). */
export function planColumns(out: Phases, old: TableShape, next: TableShape, siteOf: (column: string) => ChangeSite, book: DecisionBook, bumped: boolean) {
  const has = (table: TableShape, name: string) => table.columns.some(entry => entry.name === name);
  const required = (column: StoredColumn) => !column.storage.nullable && column.storage.default === undefined;
  // Dropping a fact or giving every object a new one changes every stored object.
  const everyRow = isObjectTable(next) && (old.columns.some(column => !has(next, column.name)) ||
    next.columns.some(column => !has(old, column.name) && required(column)));
  const version = isObjectTable(next) && !everyRow && !bumped ? `, "version" = "version" + 1` : "";
  for (const column of old.columns) {
    if (has(next, column.name)) continue;
    if (!book.drop(siteOf(column.name))) decisionRequired(siteOf(column.name), "drops a fact and its stored values", "drop: { field, approvedBy }");
    out.dropColumns.push(`ALTER TABLE ${qualified(next)} DROP COLUMN ${quoted(column.name)};\n`);
  }
  for (const column of next.columns) {
    const before = old.columns.find(entry => entry.name === column.name);
    if (before) { changeColumn(out, next, siteOf(column.name), before, column, book, version); continue; }
    const rendered = `ALTER TABLE ${qualified(next)} ADD COLUMN ${renderColumn(next, column).trim()}`;
    if (!required(column)) { out.addColumns.push(`${rendered};\n`); continue; }
    const fill = book.fill(siteOf(column.name)) ??
      decisionRequired(siteOf(column.name), "adds a required fact to the stored objects", "fill: { field, value, approvedBy }");
    out.addColumns.push(`${rendered} DEFAULT ${fillLiteral(column.storage, fill.value, `${next.qualifiedName}.${column.name}`)};\n`,
      alterColumn(next, column.name, "DROP DEFAULT"));
  }
  if (everyRow && !bumped) out.bump.push(bumpVersion(next));
}
