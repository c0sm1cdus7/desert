import type { Event } from "../../src/journal/facts.ts";
import { requestCauses } from "../../src/doors/socket/requests/request-book.ts";
import { expect } from "vitest";
/** A socket act keeps its request key and content hash as causes (law 244): references to a request, not facts. */
const request = (cause: string): boolean => requestCauses.some(prefix => cause.startsWith(prefix));
/** Every other cause names a fact in this same journal, including facts outside the mind's own acts. */
export function journalCauses(facts: readonly { id: string; kind: string; cause: readonly string[] }[]): void {
  const ids = new Set(facts.map(event => event.id));
  expect(
    facts.flatMap(event =>
      event.cause
        .filter(id => !ids.has(id) && !request(id))
        .map(cause => ({ fact: event.id, kind: event.kind, cause })),
    ),
  ).toEqual([]);
}

/** Check before closing, and release resources even when the invariant fails. */
export function closeWithCauses(close: () => void, facts: () => Parameters<typeof journalCauses>[0]): () => void {
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    try {
      journalCauses(facts());
    } finally {
      close();
    }
  };
}

/** Attach the same full-journal check to every real test house, including each reopened instance. */
export function checkedHouse<
  H extends {
    close(): void;
    journal: { replay<S>(initial: S, step: (state: S, event: Event) => S): S };
  },
>(house: H): H {
  house.close = closeWithCauses(house.close.bind(house), () =>
    house.journal.replay<Event[]>([], (all, event) => [...all, event]),
  );
  return house;
}
