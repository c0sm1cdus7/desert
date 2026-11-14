// BEGIN IMMEDIATE makes the tail comparison and subsequent writes indivisible against other connections.
import type { DatabaseSync } from "node:sqlite";
import type { writerLease } from "./writer-lease.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
export function journalPosition(db: DatabaseSync, lease: ReturnType<typeof writerLease>) {
  const tail = () => Number(db.prepare(journalTexts.lastSequenceSql).get()?.seq);
  let expected = tail();
  return {
    begin: () => {
      try {
        db.exec(journalTexts.beginWrite);
      } catch (error) {
        if (error instanceof Error && "errcode" in error && [5, 6].includes(Number(error.errcode))) lease.lose();
        throw error;
      }
    },
    check: () => {
      if (tail() !== expected) lease.lose();
    },
    wrote: (seq: number) => {
      expected = seq;
    },
    mark: () => {
      const before = expected;
      return () => {
        expected = before;
      };
    },
  };
}
