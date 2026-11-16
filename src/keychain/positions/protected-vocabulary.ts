// Disk reads admit references only in declared secret positions; incoming facts keep their original check.
import { deepFreeze, type Event, type Foreign, type Vocabulary } from "../../journal/vocabulary.ts";
import { stateResult } from "../../journal/readonly-state.ts";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { storedSchema } from "./secret-positions.ts";

export function protectedVocabulary<P extends Foreign>(words: Vocabulary<P>): Vocabulary<P> {
  const event = Type.Unsafe<Event<P>>(storedSchema(words.event));
  return {
    ...words,
    event,
    read: (value: unknown) => {
      if (!Value.Check(event, value)) throw new Error("Invalid protected event");
      const kept = structuredClone(stateResult(value));
      deepFreeze(kept);
      return kept;
    },
  };
}
