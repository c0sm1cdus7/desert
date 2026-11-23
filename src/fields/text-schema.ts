// The shape a text has where it is kept or travels: what someone wrote, or a phrase in every language.
import { Type } from "@sinclair/typebox";
import type { Language } from "./languages.ts";
/** A phrase in a fact: every language, none of them chosen. */
const each = { en: Type.String(), es: Type.String() } satisfies Record<Language, unknown>;
export const phraseSchema = Type.Object(each, { additionalProperties: false });
/** A text in a fact: what someone wrote, or the house's words in every language. */
export const textSchema = Type.Union([Type.String(), phraseSchema]);
