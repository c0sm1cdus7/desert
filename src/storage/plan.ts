// Law (plan §15, step 7.3): a migration is the generated difference between the storage model of the installed digest
// and the model of the current declaration. Additive changes are planned automatically (a new object or reference fact, a
// nullable column, a wider check, an index); a change that could lose or reject stored data needs its decision
// (src/storage/migration-decisions.ts). The body runs in one transaction per client database (src/storage/migrate.ts).
// Raises MIGRATION_DECISION_REQUIRED, MIGRATION_DECISION_UNUSED, MIGRATION_MODEL.
import { isDeepStrictEqual } from "node:util";
import { installationLanguage } from "./client-installation.ts";
import type { TableShape } from "./declare.ts";
import { decisionBook, decisionRequired, type ChangeSite, type DecisionBook, type MigrationDecision } from "./migration-decisions.ts";
import { addUnique, bumpVersion, dropUnique, limitFunction, validateLimit } from "./migration-sql.ts";
import type { StorageModel } from "./model.ts";
import { phases, planColumns, type Phases } from "./plan-columns.ts";
import { qualified, quoted, quotedList, renderLabelsFunction, usesLabelsFunction } from "./render-checks.ts";
import { renderIndex, renderLimit, renderTable } from "./render-ddl.ts";
import { renderLanguageCollation, usesLanguageCollation } from "./render-language.ts";

export type MigrationPlan = Readonly<{ body: string; decisions: readonly MigrationDecision[] }>;

/** A join table `<object>_<fact>` belongs to its object's table; decisions name it by that object and fact. */
function siteOf(table: TableShape): ChangeSite {
  if (table.columns.some(column => column.name === "version")) return { table: table.name };
  const owner = table.foreignKeys.find(key => key.columns.length === 1 && key.columns[0] === "object_id")?.references.table;
  if (!owner || !table.name.startsWith(`${owner.name}_`)) throw new Error(`MIGRATION_MODEL: ${table.qualifiedName}: neither an object table nor a join table; contract: src/storage/plan.ts`);
  return { table: owner.name, field: table.name.slice(owner.name.length + 1) };
}
const columnSite = (table: TableShape) => (column: string): ChangeSite => {
  const site = siteOf(table);
  return site.field === undefined ? { table: site.table, field: column } : site;
};
const isJoin = (table: TableShape) => siteOf(table).field !== undefined;
const sameSet = (left: readonly string[], right: readonly string[]) => left.length === right.length && left.every(name => right.includes(name));
const dropTable = (table: TableShape) => `DROP TABLE ${qualified(table)};\n` +
  table.limits.map(limit => `DROP FUNCTION ${limitFunction(table, limit)}();\n`).join("");

function planKept(out: Phases, old: TableShape, next: TableShape, book: DecisionBook, bumped: boolean) {
  const site = columnSite(next);
  if (!isDeepStrictEqual(old.primaryKey, next.primaryKey)) decisionRequired(siteOf(next), "changes the primary key", "a new object type");
  for (const key of next.foreignKeys) {
    const before = old.foreignKeys.find(entry => isDeepStrictEqual(entry.columns, key.columns));
    if (before && !isDeepStrictEqual(before, key)) decisionRequired(site(key.columns[0]!), "references another table", "a new fact, and drop: { field, approvedBy } for this one");
    const added = key.columns.every(name => !old.columns.some(column => column.name === name));
    if (!before && !added) decisionRequired(site(key.columns[0]!), "gains a reference its stored values were not checked against", "a new fact");
    if (!before) out.addConstraints.push(`ALTER TABLE ${qualified(next)} ADD FOREIGN KEY (${quotedList(key.columns)}) REFERENCES ${qualified(key.references.table)} (${quotedList(key.references.columns)});\n`);
  }
  for (const unique of old.unique) if (!next.unique.some(set => sameSet(set, unique))) out.dropConstraints.push(dropUnique(old, unique));
  for (const unique of next.unique) {
    if (old.unique.some(set => sameSet(set, unique))) continue;
    if (!book.narrow({ table: siteOf(next).table, unique })) decisionRequired({ table: siteOf(next).table }, `adds unique (${unique.join(", ")}); stored duplicates would be rejected`, "narrow: { unique: [facts], approvedBy }");
    out.addConstraints.push(addUnique(next, unique));
  }
  for (const index of old.indexes) {
    if (!next.indexes.some(entry => isDeepStrictEqual(entry, index))) out.dropConstraints.push(`DROP INDEX ${old.namespace ? `${quoted(old.namespace)}.` : ""}${quoted(index.name)};\n`);
  }
  for (const index of next.indexes) {
    if (old.indexes.some(entry => isDeepStrictEqual(entry, index))) continue;
    if (index.unique && !book.narrow({ table: siteOf(next).table, unique: index.columns })) decisionRequired({ table: siteOf(next).table }, `adds unique index ${index.name}`, "narrow: { unique: [facts], approvedBy }");
    out.addConstraints.push(renderIndex(next, index));
  }
  for (const limit of old.limits) {
    if (next.limits.some(entry => entry.column === limit.column)) continue;
    out.dropConstraints.push(`DROP TRIGGER ${quoted(`${old.name}_${limit.column}_limit`)} ON ${qualified(old)};\nDROP FUNCTION ${limitFunction(old, limit)}();\n`);
  }
  for (const limit of next.limits) {
    const before = old.limits.find(entry => entry.column === limit.column);
    if (before?.maximum === limit.maximum) continue;
    if (!before || limit.maximum < before.maximum) {
      if (!book.narrow(site(limit.column))) decisionRequired(site(limit.column), `allows at most ${limit.maximum} items${before ? ` (was ${before.maximum})` : ""}`, "narrow: { field, approvedBy }");
      out.addConstraints.push(validateLimit(next, limit));
    }
    out.addConstraints.push(renderLimit(next, limit));
  }
  planColumns(out, old, next, site, book, bumped);
}

function planNamespaces(out: Phases, from: StorageModel, to: StorageModel) {
  const language = installationLanguage(to.language);
  const namespaces = [...new Set([...from.tables, ...to.tables].map(table => table.namespace))];
  for (const namespace of namespaces) {
    const [before, after] = [from, to].map(model => model.tables.filter(table => table.namespace === namespace)) as [TableShape[], TableShape[]];
    const uses = (tables: TableShape[], test: (table: TableShape) => boolean) => tables.some(test);
    if (namespace === undefined) continue;
    if (!before.length) out.prepare.push(`CREATE SCHEMA IF NOT EXISTS ${quoted(namespace)};\n`);
    if (uses(after, usesLanguageCollation) && !uses(before, usesLanguageCollation)) out.prepare.push(renderLanguageCollation(namespace, language));
    if (uses(after, usesLabelsFunction) && !uses(before, usesLabelsFunction)) out.prepare.push(renderLabelsFunction(namespace));
    if (uses(before, usesLabelsFunction) && !uses(after, usesLabelsFunction)) out.cleanup.push(`DROP FUNCTION ${quoted(namespace)}."desert_labels_valid"(text[], integer, integer);\n`);
    if (uses(before, usesLanguageCollation) && !uses(after, usesLanguageCollation)) out.cleanup.push(`DROP COLLATION ${quoted(namespace)}."desert_language";\n`);
    if (!after.length) out.cleanup.push(`DROP SCHEMA ${quoted(namespace)};\n`);
  }
}

export function planMigration(from: StorageModel, to: StorageModel, decisions: readonly unknown[]): MigrationPlan {
  if (from.product !== to.product || from.language !== to.language) {
    throw new Error(`MIGRATION_MODEL: ${from.product}.${from.language} → ${to.product}.${to.language}: a migration stays within one product and language; contract: src/storage/plan.ts`);
  }
  const book = decisionBook(decisions), out = phases(), bumped = new Set<string>();
  const find = (model: StorageModel, table: TableShape) => model.tables.find(entry => entry.qualifiedName === table.qualifiedName);
  const removedObjects = from.tables.filter(table => !isJoin(table) && !find(to, table)).map(table => table.name);
  for (const table of [...from.tables].reverse()) {
    if (find(to, table)) continue;
    const site = siteOf(table);
    if (site.field !== undefined && removedObjects.includes(site.table)) {
      out.dropJoins.push(dropTable(table));
      continue;
    }
    if (!book.drop(site)) {
      decisionRequired(site, site.field === undefined ? "drops an object type and every stored object of it" : "drops a reference fact and its stored references",
        site.field === undefined ? "drop: { approvedBy } for the object" : "drop: { field, approvedBy }");
    }
    (site.field === undefined ? out.dropTables : out.dropJoins).push(dropTable(table));
    const owner = from.tables.find(entry => entry.name === site.table && entry.namespace === table.namespace);
    if (site.field !== undefined && owner && find(to, owner)) {
      out.bump.push(bumpVersion(owner));
      bumped.add(owner.qualifiedName);
    }
  }
  for (const table of to.tables) {
    const before = find(from, table);
    if (before) planKept(out, before, table, book, bumped.has(table.qualifiedName));
    else out.createTables.push(renderTable(table) + table.indexes.map(index => renderIndex(table, index)).join("") +
      table.limits.map(limit => renderLimit(table, limit)).join(""));
  }
  planNamespaces(out, from, to);
  const used = book.used();
  const ordered = Object.entries(out).flatMap(([phase, statements]) => phase === "bump" ? [...new Set(statements)] : statements);
  return { body: ordered.join(""), decisions: used };
}
