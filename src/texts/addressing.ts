import { addressingTexts as words } from "./addressing.texts.ts";
const whole = (pattern: string, flags: string): RegExp => new RegExp(`(?<!\\p{L})(${pattern})(?!\\p{L})`, flags);
const pronouns = whole(words.pronouns, "iu");
const orders = whole(words.orders, "iu");
const verbs = whole("\\p{L}{2,}[áéí]s", "giu");
const done = whole("\\p{L}{2,}(aste|iste)", "giu");
const known: ReadonlySet<string> = new Set([...words.notVerbs, ...words.notDone, ...words.notDoneEither]);
const verbsIn = (text: string): string[] => [...(text.match(verbs) ?? []), ...(text.match(done) ?? [])];
export const addresses = (text: string): boolean =>
  pronouns.test(text) || orders.test(text) || verbsIn(text).some(word => !known.has(word.toLowerCase()));
