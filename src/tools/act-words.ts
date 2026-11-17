// The words an act is declared with, checked when a program is composed: what a row says, what confirms it, what
// it is for and why it is refused are data beside a row, never sentences, and speak to nobody.
import { addresses } from "../texts/addressing.ts";
/** What a row says is not a sentence: it starts no phrase with a capital, carries no punctuation and is short. */
const phrase = /^(?![A-ZÁÉÍÓÚÑ][a-záéíóúñ])[^.,;:!?¡¿]{1,28}$/u;
const verb = /^[a-záéíóúñü]{2,14}$/u;
/** The name and the verb of an act as its rows will say them; an act that words itself as a sentence is refused
 * when the program is composed. */
export function worded<W extends { name: string; enter?: string }>(words: W): W {
  if (!phrase.test(words.name)) throw new Error(`An act's name is a sentence, or too long for its row: ${words.name}`);
  if (addresses(words.name)) throw new Error(`An act's name speaks to who reads it: ${words.name}`);
  if (words.enter !== undefined && !verb.test(words.enter))
    throw new Error(`What confirms an act is one verb in lower case: ${words.enter}`);
  return words;
}
/** What an act is for is said to the right of its row when it has no datum: short, and no sentence. */
const aidShape = /^(?![A-ZÁÉÍÓÚÑ][a-záéíóúñ])[^.,;:!?¡¿]{1,44}$/u;
export function aid(purpose: string): string {
  if (!aidShape.test(purpose)) throw new Error(`A purpose is said beside its act, short and no sentence: ${purpose}`);
  if (addresses(purpose)) throw new Error(`A purpose speaks to who reads it: ${purpose}`);
  return purpose;
}
/** A cause is said as a datum, to the right of the act it turned off: no full stop, and short enough to fit. */
export function short(cause: string): void {
  if (cause.length > 44 || /[.!?]$/u.test(cause)) throw new Error(`A cause reads as a sentence: ${cause}`);
  if (addresses(cause)) throw new Error(`A cause speaks to who reads it: ${cause}`);
}
