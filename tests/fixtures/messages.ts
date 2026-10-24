// The message catalog of the SDK's own test products (plan §14). Tests are not product source, so their bundle is the module
// message-sentences.ts instead of a messages/en.json. Fixtures written once as compiled wire data (view-program.ts) are
// re-declared through `declaredFixture`, which names each sentence by its key here and fails loudly on an unknown one.
import { messageCatalog } from "../../src/messages/catalog.ts";
import { domainFields, messageFields, resolveMessages, type Declared } from "../../src/views/declared.ts";
import type { Message } from "../../src/views/definition.ts";
import { fixtureSentences } from "./message-sentences.ts";

export const FixtureMessages = messageCatalog({ en: { fixture: fixtureSentences } } as const);
export const fixtureText = FixtureMessages.m.fixture;

const keyOf = new Map<string, string>(Object.entries(fixtureSentences).map(([key, sentence]) => [sentence, key]));
const fields: ReadonlySet<string> = new Set(messageFields), domains: ReadonlySet<string> = new Set(domainFields);

/** The message of a sentence of the fixture catalog. */
export function fixtureMessage(sentence: string): Message {
  const key = keyOf.get(sentence);
  if (!key) throw new Error(`MESSAGE_MISSING: the fixture catalog has no sentence ${JSON.stringify(sentence)}; add it to message-sentences.ts`);
  return Object.freeze({ key: `fixture.${key}` });
}

function declared(value: unknown, inField: boolean): unknown {
  if (typeof value === "string") return inField ? fixtureMessage(value) : value;
  if (Array.isArray(value)) return value.map(item => declared(item, false));
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, domains.has(key) ? item : declared(item, fields.has(key))]));
}

/** A compiled fixture as a product declares it: every sentence in a message field becomes its fixture message. */
export function declaredFixture<const T>(compiled: T): Declared<T> {
  return declared(compiled, false) as Declared<T>;
}

/** The compiled form of a declaration: what composing a product resolves it to (each message's English sentence). */
export type Resolved<T> = T extends Message ? string : T extends readonly unknown[] ? { [Index in keyof T]: Resolved<T[Index]> }
  : T extends object ? { [Key in keyof T]: Resolved<T[Key]> } : T;
/** A declaration resolved by the fixture catalog, for a test that hands it to a compiled-level check directly. */
export function compiledFixture<const T>(declaration: T): Resolved<T> {
  return resolveMessages(declaration, FixtureMessages.bundle("en")) as Resolved<T>;
}
