// Disk reads admit references only in declared secret positions; incoming facts keep their original check.
import { stateResult } from "../../journal/readonly-state.ts";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Event, Foreign, Vocabulary } from "../../journal/facts.ts";
import { storedSchema } from "./secret-positions.ts";
const freeze = (value: unknown): void => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  Object.values(value).forEach(freeze);
};
export function protectedVocabulary<P extends Foreign>(words: Vocabulary<P>): Vocabulary<P> {
  const event = Type.Unsafe<Event<P>>(storedSchema(words.event));
  return {
    ...words,
    event,
    read: (value: unknown) => {
      if (!Value.Check(event, value)) throw new Error("Invalid protected event");
      const kept = structuredClone(stateResult(value));
      freeze(kept);
      return kept;
    },
  };
}
