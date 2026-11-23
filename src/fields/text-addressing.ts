// Whether a text speaks to whoever reads it: by its pronouns, the orders it gives, or a verb said to one person.
import { addressingTexts as words } from "../texts/addressing.texts.ts";
import type { Text } from "./phrases.ts";

const whole = (pattern: string, flags: string): RegExp => new RegExp(`(?<!\\p{L})(${pattern})(?!\\p{L})`, flags);
const pronouns = whole(words.pronouns, "iu");
const pronounsEn = whole(words.pronounsEn, "iu");
const orders = whole(words.orders, "iu");
/** A verb said to one person ends as these do; so do a few words that are no verb at all. */
const verbs = whole("\\p{L}{2,}[áéí]s", "giu");
/** What one person did ends as these do: «cambiaste», «pediste». */
const done = whole("\\p{L}{2,}(aste|iste)", "giu");
const known: ReadonlySet<string> = new Set([...words.notVerbs, ...words.notDone, ...words.notDoneEither]);
const verbsIn = (text: string): string[] => [...(text.match(verbs) ?? []), ...(text.match(done) ?? [])];
const spanish = (text: string): boolean =>
  pronouns.test(text) || orders.test(text) || verbsIn(text).some(word => !known.has(word.toLowerCase()));
/** Each language by its own marks; what someone wrote, by those of every language. */
export const addresses = (text: Text): boolean =>
  typeof text === "string" ? spanish(text) || pronounsEn.test(text) : spanish(text.es) || pronounsEn.test(text.en);
