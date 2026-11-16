// Inspect old values even when a current marked field has a stricter length or type.
import { Type } from "@sinclair/typebox";
import type { Event, Foreign, Vocabulary } from "../../journal/facts.ts";
import { record } from "../positions/secret-positions.ts";
import { protectedVocabulary } from "../positions/protected-vocabulary.ts";
export function inspectionVocabulary<P extends Foreign>(words: Vocabulary<P>): Vocabulary<P> {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (!record(value)) return value;
    if (value.secret === true) return Type.Unknown({ secret: true });
    return Object.fromEntries(Reflect.ownKeys(value).map(key => [key, walk(Reflect.get(value, key))]));
  };
  const schema = walk(words.event);
  const event = Type.Unsafe<Event<P>>(record(schema) ? schema : {});
  return protectedVocabulary({ ...words, event });
}
