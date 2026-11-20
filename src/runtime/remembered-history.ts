// Keeps the facts of a house in memory for its minds, reading from the journal only what was appended since.
import type { Event, Foreign } from "../journal/vocabulary.ts";
type Source<P extends Foreign> = Readonly<{
  replay: <S>(initial: S, reduce: (state: S, event: Event<P>) => S, after?: number) => S;
}>;
type Writes<P extends Foreign> = Readonly<{
  on: (listener: (event: Event<P>) => void) => () => void;
  onRollback: (restore: () => void) => void;
}>;
function read<P extends Foreign>(journal: Source<P>, after = 0): Event<P>[] {
  return journal.replay<Event<P>[]>(
    [],
    (events, event) => {
      events.push(event);
      return events;
    },
    after,
  );
}
/** The mind schedule asks for the history at every fact, for every scope: reading and validating the whole journal
 * each time stopped the house for tens of seconds. A read here adds only what was appended since the last one. A
 * write that rolls back forgets everything, and so does a last fact that is no longer the journal's, so a read never
 * returns what the journal does not hold. Each returned list is never changed afterwards. */
export function rememberedHistory<P extends Foreign>(journal: Source<P>, bus: Writes<P>): () => readonly Event<P>[] {
  let known: readonly Event<P>[] = [];
  const forget = () => {
    known = [];
  };
  bus.on(() => bus.onRollback(forget));
  return () => {
    const last = known.at(-1);
    if (!last) known = read(journal);
    else {
      const [same, ...fresh] = read(journal, last.seq - 1);
      if (same?.id !== last.id) known = read(journal);
      else if (fresh.length) known = [...known, ...fresh];
    }
    return known;
  };
}
