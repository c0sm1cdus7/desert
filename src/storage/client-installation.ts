// Law (owner answers 2026-10-25, Q4/Q47/Q48/Q20/Q50): a client is one full installation — its own server, database, master
// key and people. The database is the client boundary, so no row names a client (declare.ts refuses a client-mark column)
// and a login is unique within its installation (desert_identity_accounts UNIQUE (login)). Products of one client share its
// database, one Postgres schema each (ddl.ts productNamespace). Raises INSTALLATION_LANGUAGE.

declare const languageBrand: unique symbol;
/** A canonical BCP 47 tag that ICU collates (Node's ICU and Postgres's ICU provider read the same tag). */
export type InstallationLanguage = string & { readonly [languageBrand]: true };

/** What a client installation declares for its storage. Every field is required: there is no default language (law 15). */
export type ClientInstallation = Readonly<{ language: InstallationLanguage }>;

/** Q50: the master key of each installation has two copies, on the hosting platform and in the owner's Keychain; the first
 * administrator's access code travels the same way and is never printed. Slice 12 provisions both from this declaration. */
export const masterKeyCustody = Object.freeze({ copies: Object.freeze(["platform", "owner-keychain"] as const), firstAccessCode: "owner-keychain" } as const);
export type MasterKeyCopy = typeof masterKeyCustody.copies[number];

const fail = (what: string): never => {
  throw new Error(`INSTALLATION_LANGUAGE: ${what}; contract: src/storage/client-installation.ts`);
};

/** Q20: the language orders the installation's text (an ICU collation) and its search ignores accents (unaccent). */
export function installationLanguage(tag: unknown): InstallationLanguage {
  if (typeof tag !== "string" || tag.length === 0) return fail("an installation declares its language (no default)");
  let canonical: string | undefined;
  try { canonical = Intl.getCanonicalLocales(tag)[0]; } catch { return fail(`${JSON.stringify(tag)} is not a BCP 47 language tag`); }
  if (canonical !== tag) fail(`${JSON.stringify(tag)} is not canonical; declare ${JSON.stringify(canonical)}`);
  if (Intl.Collator.supportedLocalesOf([tag]).length !== 1) fail(`ICU has no collation for ${JSON.stringify(tag)}`);
  return tag as InstallationLanguage;
}

export function clientInstallation(declaration: Readonly<{ language: string }>): ClientInstallation {
  return Object.freeze({ language: installationLanguage(declaration.language) });
}
