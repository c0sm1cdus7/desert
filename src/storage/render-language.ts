// Law (owner answer Q20): text orders by the ICU collation of the installation's declared language, and search ignores
// accents through `unaccent` (a trusted extension since PostgreSQL 13), both created by the generated DDL in every client
// database. Raises INSTALLATION_LANGUAGE (at generation without a language; in Postgres when a database already holds
// the product in another language, so a reinstall never silently keeps the old order).
import type { InstallationLanguage } from "./client-installation.ts";
import type { TableShape } from "./declare.ts";
import { literal, quoted } from "./render-checks.ts";

const collationName = "desert_language";

export const usesLanguageCollation = (table: TableShape) => table.columns.some(column => column.storage.collation === "installation-language");

/** The collation a namespace's text columns use: one per product schema, all in the installation's one language. */
export function languageCollation(table: TableShape): string {
  if (table.namespace === undefined) {
    throw new Error(`STORAGE_DECLARATION: ${table.qualifiedName}: a collated column needs a product namespace; contract: src/storage/render-language.ts`);
  }
  return `${quoted(table.namespace)}.${quoted(collationName)}`;
}

export function renderLanguageCollation(namespace: string | undefined, language: InstallationLanguage | undefined): string {
  if (namespace === undefined) throw new Error("STORAGE_DECLARATION: a collation needs a product namespace; contract: src/storage/render-language.ts");
  if (language === undefined) throw new Error(`INSTALLATION_LANGUAGE: ${namespace}: text facts need the installation's language; contract: src/storage/client-installation.ts`);
  const qualified = `${quoted(namespace)}.${quoted(collationName)}`;
  const present = `FROM pg_collation WHERE collnamespace = ${literal(namespace)}::regnamespace AND collname = ${literal(collationName)}`;
  const message = `INSTALLATION_LANGUAGE: ${namespace}.${collationName} is not ${language}: this database holds the product in another language`;
  return `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 ${present}) THEN
    CREATE COLLATION ${qualified} (provider = icu, locale = ${literal(language)});
  ELSIF NOT EXISTS (SELECT 1 ${present} AND collprovider = 'i' AND colllocale = ${literal(language)}) THEN
    RAISE EXCEPTION ${literal(message)} USING ERRCODE = 'invalid_parameter_value';
  END IF;
END
$$;
`;
}

/** `desert_search_key(text)`: the accent- and case-insensitive key a search compares (immutable, so an index may hold it). */
export const renderSearchSupport = () => `CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";
CREATE OR REPLACE FUNCTION "public"."desert_search_key"(value text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT lower("public"."unaccent"('public.unaccent'::regdictionary, value))
$$;
`;
