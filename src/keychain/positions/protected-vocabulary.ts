// Disk reads admit references only in declared secret positions; incoming facts keep their original check.
import { deepFreeze, type Event, type Foreign, type Vocabulary } from "../../journal/vocabulary.ts";
import { stateResult } from "../../journal/readonly-state.ts";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { isImmutableSchema } from "../../fields/schema-shape.ts";
import { currentCoreValue } from "../../house/core-value-history.ts";
import { storedSchema } from "./secret-positions.ts";

export function protectedVocabulary<P extends Foreign>(words: Vocabulary<P>): Vocabulary<P> {
  const event = Type.Unsafe<Event<P>>(storedSchema(words.event));
  if (isImmutableSchema(words.event)) deepFreeze(event);
  return {
    ...words,
    event,
    read: (value: unknown) => {
      if (!Value.Check(event, value)) throw new Error("Invalid protected event");
      const normalized = currentCoreValue(value);
      let checked = value;
      if (normalized !== value) {
        if (!Value.Check(event, normalized)) throw new Error("Invalid protected event");
        checked = normalized;
      }
      const kept = structuredClone(stateResult(checked));
      deepFreeze(kept);
      return kept;
    },
  };
}
