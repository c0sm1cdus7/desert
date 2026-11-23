// A text in every language: a person reads it in their own; minds, ids and the code read it in English.
import { isLanguage, languages, workingLanguage, type Language } from "./languages.ts";
/** Words said once in each language: whoever reads picks the language they read the house in. */
export type Phrase = Readonly<Record<Language, string>>;
/** What someone wrote, the same in every language, or the house's own words in each. */
export type Text = string | Phrase;
export const isPhrase = (value: unknown): value is Phrase =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).length === languages.length &&
  Object.keys(value).every(isLanguage) &&
  languages.every(language => typeof Reflect.get(value, language) === "string");
/** The same words built once in each language. */
export const phrase = (say: (language: Language) => string): Phrase => ({ en: say("en"), es: say("es") });
/** What a reader reads: the phrase in its language, or what someone wrote, as written. */
export const said = (text: Text, language: Language): string => (typeof text === "string" ? text : text[language]);
/** What the code compares and keeps as an id: the words in the working language. */
export const meant = (text: Text): string => said(text, workingLanguage);
/** Two texts say the same when they say it in the working language; words someone already reads in one language
 * say what a phrase says in that language. */
export const same = (a: Text | undefined, b: Text | undefined): boolean => {
  if (a === undefined || b === undefined) return false;
  if (typeof a === "string" && typeof b !== "string") return languages.some(language => b[language] === a);
  if (typeof b === "string" && typeof a !== "string") return languages.some(language => a[language] === b);
  return meant(a) === meant(b);
};
/** Each text of a list, or of a phrase built from them, in every language. */
export const joined = (parts: readonly Text[], separator = " · "): Phrase =>
  phrase(language => parts.map(part => said(part, language)).join(separator));
/** A table of words as one reader reads it: each phrase in their language, each phrase a function says too. */
export type InLanguage<T> = T extends Phrase
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => InLanguage<R>
    : T extends readonly (infer U)[]
      ? readonly InLanguage<U>[]
      : T extends object
        ? { readonly [K in keyof T]: InLanguage<T[K]> }
        : T;
const read = (value: unknown, language: Language): unknown => {
  if (isPhrase(value)) return value[language];
  if (typeof value === "function") return (...args: unknown[]) => read(Reflect.apply(value, undefined, args), language);
  if (Array.isArray(value)) return value.map(each => read(each, language));
  if (value === null || typeof value !== "object") return value;
  /** A field asks its question under `said`: whoever reads the field reads it as its title. */
  const asked: unknown = Reflect.get(value, "said");
  const entries = Object.entries(value).filter(([key]) => key !== "said" || !isText(asked));
  const title = isText(asked) ? [["title", read(asked, language)] as const] : [];
  return Object.fromEntries([...entries.map(([key, each]) => [key, read(each, language)] as const), ...title]);
};
const isText = (value: unknown): value is Text => typeof value === "string" || isPhrase(value);
/** Any data as one reader reads it: every phrase in it in their language, every field's question as its title. */
export const inLanguage = (value: unknown, language: Language): unknown => read(value, language);
const tables = new WeakMap<object, Map<Language, unknown>>();
/** The words of a table in one language: built once per table and language, and the same object after. */
export function wordsIn<T extends object>(table: T, language: Language): InLanguage<T>;
export function wordsIn(table: object, language: Language): unknown {
  const known = tables.get(table) ?? new Map<Language, unknown>();
  tables.set(table, known);
  if (!known.has(language)) known.set(language, read(table, language));
  return known.get(language);
}
/** A tool's reading as one reader reads it: each line of data with every phrase in their language, a line that is
 * one phrase as its words. A line that is no data is what someone wrote, and stays as it is. */
export const linesIn = (view: string, language: Language): string =>
  view
    .split("\n")
    .map(line => {
      try {
        const data: unknown = JSON.parse(line);
        if (typeof data !== "object" || data === null) return line;
        const shown = read(data, language);
        return typeof shown === "string" ? shown : JSON.stringify(shown);
      } catch {
        return line;
      }
    })
    .join("\n");
/** The same words in lower case, in every language they are said in. */
export const lowered = (text: Text): Text =>
  typeof text === "string" ? text.toLowerCase() : phrase(language => text[language].toLowerCase());
/** A text as a line of a tool's reading: what someone wrote as it is, a phrase as data its reader reads. */
export const viewLine = (text: Text): string => (typeof text === "string" ? text : JSON.stringify(text));
/** A text for a reader whose language is not known yet: its words in every language, once each. */
export const everySaid = (text: Text): string =>
  [...new Set(languages.map(language => said(text, language)))].join(" · ");
