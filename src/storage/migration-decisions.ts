// Law (plan §15, step 7.3): a change that could lose or reject stored data is never inferred; the declaration diff carries
// an explicit decision for it, or the plan fails MIGRATION_DECISION_REQUIRED. Decisions name declared ids (object id, fact
// name); the plan records the ones it used in the migration's header, and a decision the plan did not use fails
// MIGRATION_DECISION_UNUSED, so a stale approval never waits for a later, different change.
//   drop     a fact (field) or a whole object (no field) and its stored values;
//   migrate  enum narrowing: rows holding `from` are rewritten to `to` (a value the new declaration keeps);
//   fill     a new required fact: existing rows receive `value`; also a nullable column that becomes required;
//   narrow   a tighter check (shorter text, smaller range or label limits, fewer references, a new unique set): applied as
//            declared; a client whose rows break it fails its migration and stays at its previous digest.
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { sqlIdentifier } from "./declare.ts";

const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1 });
const approvedBy = id;
export const FillValueSchema = Type.Union([Type.String(), Type.Integer(), Type.Boolean(), Type.Array(Type.String())]);
export const MigrationDecisionSchema = Type.Union([
  Type.Object({ object: id, drop: Type.Object({ field: Type.Optional(id), approvedBy }, closed) }, closed),
  Type.Object({ object: id, migrate: Type.Object({ field: id, from: id, to: id }, closed) }, closed),
  Type.Object({ object: id, fill: Type.Object({ field: id, value: FillValueSchema, approvedBy }, closed) }, closed),
  Type.Object({ object: id, narrow: Type.Union([Type.Object({ field: id, approvedBy }, closed),
    Type.Object({ unique: Type.Array(id, { minItems: 1 }), approvedBy }, closed)]) }, closed),
]);
export type MigrationDecision = Static<typeof MigrationDecisionSchema>;
export type FillValue = Static<typeof FillValueSchema>;

/** Where a change sits: the object's table and, for a column or a reference fact's join table, the fact's column. */
export type ChangeSite = Readonly<{ table: string; field?: string; unique?: readonly string[] }>;

export function decisionRequired(site: ChangeSite, what: string, decision: string): never {
  const where = `${site.table}${site.field === undefined ? "" : `.${site.field}`}`;
  throw new Error(`MIGRATION_DECISION_REQUIRED: ${where}: ${what}; declare ${decision}; contract: src/storage/migration-decisions.ts`);
}

const sameSet = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every(name => right.includes(name));

/** The decisions of one plan: each is taken at most once per site, and every one must be taken. */
export function decisionBook(decisions: readonly unknown[]) {
  const entries = decisions.map((decision, position) => {
    if (!Value.Check(MigrationDecisionSchema, decision)) {
      throw new Error(`MIGRATION_DECISION: decision ${position} is not a drop, migrate, fill or narrow block; contract: src/storage/migration-decisions.ts`);
    }
    const table = sqlIdentifier(decision.object, `decision ${position}`);
    const field = (name: string) => sqlIdentifier(name, `decision ${position}`);
    return { decision, table, field, used: false };
  });
  const at = (site: ChangeSite) => entries.filter(entry => entry.table === site.table);
  const take = <T>(found: { used: boolean }[], value: T) => { for (const entry of found) entry.used = true; return value; };
  return {
    drop(site: ChangeSite) {
      const found = at(site).filter(({ decision, field }) => "drop" in decision &&
        (decision.drop.field === undefined ? site.field === undefined : field(decision.drop.field) === site.field));
      return found.length ? take(found, true) : false;
    },
    /** Every enum value mapped away from this column: from → to. */
    migrations(site: ChangeSite): ReadonlyMap<string, string> {
      const found = at(site).flatMap(entry => "migrate" in entry.decision && entry.field(entry.decision.migrate.field) === site.field
        ? [{ entry, migrate: entry.decision.migrate }] : []);
      return take(found.map(({ entry }) => entry), new Map(found.map(({ migrate }) => [migrate.from, migrate.to])));
    },
    fill(site: ChangeSite): { value: FillValue } | undefined {
      const found = at(site).flatMap(entry => "fill" in entry.decision && entry.field(entry.decision.fill.field) === site.field ? [entry] : []);
      const first = found[0];
      return first && "fill" in first.decision ? take(found, { value: first.decision.fill.value }) : undefined;
    },
    narrow(site: ChangeSite) {
      const found = at(site).filter(({ decision, field }) => "narrow" in decision && ("field" in decision.narrow
        ? site.field !== undefined && field(decision.narrow.field) === site.field
        : site.unique !== undefined && sameSet(decision.narrow.unique.map(field), site.unique)));
      return found.length ? take(found, true) : false;
    },
    /** The decisions in the order they were declared; fails MIGRATION_DECISION_UNUSED for one no change needed. */
    used(): readonly MigrationDecision[] {
      const unused = entries.find(entry => !entry.used);
      if (unused) {
        throw new Error(`MIGRATION_DECISION_UNUSED: ${JSON.stringify(unused.decision)} matches no change of this plan; remove it; contract: src/storage/migration-decisions.ts`);
      }
      return entries.map(entry => entry.decision);
    },
  };
}
export type DecisionBook = ReturnType<typeof decisionBook>;
