// Whether a text speaks to whoever reads it: by its pronouns, the orders it gives, or a verb said to one person.
import { addressingTexts as words } from "../texts/addressing.texts.ts";

const whole = (pattern: string, flags: string): RegExp => new RegExp(`(?<!\\p{L})(${pattern})(?!\\p{L})`, flags);
const pronouns = whole(words.pronouns, "iu");
const orders = whole(words.orders, "iu");
/** A verb said to one person ends as these do; so do a few words that are no verb at all. */
const verbs = whole("\\p{L}{2,}[áéí]s", "giu");
const known: ReadonlySet<string> = new Set(words.notVerbs);
export const addresses = (text: string): boolean =>
  pronouns.test(text) || orders.test(text) || (text.match(verbs) ?? []).some(word => !known.has(word.toLowerCase()));
