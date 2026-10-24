// ASSUMED, NOT CONFIRMED: the four owner questions plan §15 asks before slice 7.1, answered on the plan's recommendations.
// The owner has not answered them; this branch merges only after he does. Each answer is read only through this module,
// so changing one answer changes this file (and the code its exhaustive switch then points at), nothing else.
import type { TNull, TSchema, TUnion } from "@sinclair/typebox";
import { nullable } from "./columns.ts";
import { sqlIdentifier } from "./declare.ts";

export const storageAssumptions = {
  /** §15 Q1 "optional sparse facts as nullable columns vs. a jsonb extras column": typed nullable columns, never jsonb. */
  sparseFacts: "typed-nullable-columns",
  /** §15 Q2 "trash as a state fact (today) vs. tombstone table": a declared `state` fact. Object rows are never deleted,
   * so the generator emits no tombstone table and no ON DELETE action; a join row cannot outlive its object. */
  trash: "state-fact",
  /** §15 Q3 "cross-object atomic commands (today one object per command)": one object per command; see constraintTiming. */
  commands: "one-object-per-command",
  /** §15 Q4 "multi-tenant (one schema per product vs. one database)": one Postgres schema per product; see productNamespace. */
  tenancy: "schema-per-product",
} as const;

/** Q1. A fact every row carries is NOT NULL; a sparse fact is a nullable column of its own type. No fact kind can be
 * declared sparse yet (every FieldDefinition is required, src/schema.ts emitObject), so the generator passes false. */
export function factColumn<S extends TSchema>(schema: S, sparse: boolean): S | TUnion<[S, TNull]> {
  switch (storageAssumptions.sparseFacts) {
    case "typed-nullable-columns": return sparse ? nullable(schema) : schema;
  }
}

/** Q3. A command writes one object, so every constraint holds at the end of each statement; cross-object commands would
 * need constraints checked at commit (DEFERRABLE INITIALLY DEFERRED). */
export function constraintTiming(): "immediate" {
  switch (storageAssumptions.commands) {
    case "one-object-per-command": return "immediate";
  }
}

/** Q4, the one tenancy function: the Postgres schema that holds a product's object tables. Infrastructure tables stay in
 * their own schemas, shared by every product installed in the database. */
export function productNamespace(productId: string): string {
  switch (storageAssumptions.tenancy) {
    case "schema-per-product": return sqlIdentifier(`product_${productId}`, `product ${productId}`);
  }
}
