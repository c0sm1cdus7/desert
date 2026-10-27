// Law: a fact value has one stored form, read back to the same value (src/storage/fact-columns.ts FactValueKind).
// A reference fact is its join rows; an asset fact is the asset's uuid; an integer fact is a bigint read as text by pg.
// Raises EFFECT_UNKNOWN_FACT, INVALID_FACT_VALUE and CORRUPT_OBJECT.
import { assetMediaKind, assetReference, type PrivateAssetMetadata } from "../assets/types.ts";
import type { FactValue, Facts } from "../fact-values.ts";
import type { StoredFact, StoredObject, StoredReference } from "./ddl.ts";

export type ObjectRow = Readonly<Record<string, unknown>> & Readonly<{ id: string; version: number }>;
/** What a write assigns: scalar columns with their stored values, and reference facts with their ordered target ids. */
export type Assignment = Readonly<{ columns: readonly (readonly [string, unknown])[]; references: readonly (readonly [StoredReference, readonly string[]])[] }>;

const fail = (code: string, what: string): never => { throw new Error(`${code}: ${what}; contract: src/storage/object-values.ts`); };

/** The stored fact or reference a fact name declares, or EFFECT_UNKNOWN_FACT. */
export function storedFact(object: StoredObject, fact: string, where: string): StoredFact | StoredReference {
  return object.scalars.find(entry => entry.fact === fact) ?? object.references.find(entry => entry.fact === fact)
    ?? fail("EFFECT_UNKNOWN_FACT", `${where}: ${fact} is not a fact of ${object.id}`);
}

function storedValue(fact: StoredFact, value: unknown, where: string): unknown {
  if (fact.value === "plain" || fact.value === "integer") return value;
  if (typeof value === "object" && value !== null && "kind" in value && value.kind === "asset" && "reference" in value) return value.reference;
  return fail("INVALID_FACT_VALUE", `${where}: ${fact.fact} is an asset fact and takes an asset reference`);
}

export function assignment(object: StoredObject, facts: Readonly<Record<string, unknown>>, where: string): Assignment {
  const columns: (readonly [string, unknown])[] = [], references: (readonly [StoredReference, readonly string[]])[] = [];
  for (const [name, value] of Object.entries(facts)) {
    const stored = storedFact(object, name, where);
    if ("table" in stored) {
      if (!Array.isArray(value) || value.some(item => typeof item !== "string")) fail("INVALID_FACT_VALUE", `${where}: ${name} takes a list of ids`);
      references.push([stored, value as readonly string[]]);
    } else columns.push([stored.column, storedValue(stored, value, where)]);
  }
  return { columns, references };
}

/** What a read needs besides the rows: each reference fact's targets by object id, and each media asset's metadata. */
export type ObjectContext = Readonly<{ references: ReadonlyMap<string, ReadonlyMap<string, readonly string[]>>;
  assets: ReadonlyMap<string, PrivateAssetMetadata | null> }>;

function factValue(object: StoredObject, fact: StoredFact, value: unknown, context: ObjectContext): FactValue {
  if (value === null || value === undefined) return fail("CORRUPT_OBJECT", `${object.id}.${fact.fact} is empty`);
  switch (fact.value) {
    case "plain": return value as FactValue;
    case "integer": return Number(value);
    case "image-asset": return assetReference(String(value));
    case "media-asset": {
      const metadata = context.assets.get(String(value)) ?? fail("CORRUPT_OBJECT", `${object.id}.${fact.fact}: asset ${String(value)} has no media`);
      return assetReference(String(value), assetMediaKind(metadata));
    }
  }
}

export function objectFacts(object: StoredObject, row: ObjectRow, context: ObjectContext): Facts {
  const facts: Facts = {};
  for (const fact of object.scalars) facts[fact.fact] = factValue(object, fact, row[fact.column], context);
  for (const reference of object.references) facts[reference.fact] = [...context.references.get(reference.fact)?.get(row.id) ?? []];
  return facts;
}

/** The asset ids a read must look up for their media kind. */
export const mediaAssets = (object: StoredObject, rows: readonly ObjectRow[]) =>
  object.scalars.filter(fact => fact.value === "media-asset").flatMap(fact => rows.map(row => String(row[fact.column])));
