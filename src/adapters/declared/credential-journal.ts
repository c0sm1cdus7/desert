import { Value } from "@sinclair/typebox/value";
import { effect, type Emission, type Event, type Foreign } from "../../journal/events.ts";
import type { CredentialFact, CredentialLedger } from "../secrets/custody/custody-contract.ts";
import { factSchema } from "../secrets/custody/custody-database.ts";
import { CustodyError } from "../secrets/custody/house-keys.ts";
function readFacts<P extends Foreign>(events: readonly Event<P>[]): CredentialFact[] {
  return events.flatMap((event): CredentialFact[] => {
    if (event.kind !== "tool-entry" || event.layer !== "house") return [];
    const detail = event.data.detail;
    if (!detail || typeof detail !== "object") return [];
    let batch: unknown = [];
    if ("custodyBatch" in detail) batch = detail.custodyBatch;
    else if ("custodyFact" in detail) batch = [detail.custodyFact];
    if (!Array.isArray(batch)) throw new CustodyError("E-CUSTODY-INTEGRITY");
    return batch.map((fact: unknown) => {
      if (!Value.Check(factSchema, fact)) throw new CustodyError("E-CUSTODY-INTEGRITY");
      return fact;
    });
  });
}
function factEntry(facts: readonly CredentialFact[]) {
  const fact = facts[0];
  if (!fact) throw new CustodyError("E-CUSTODY-INTEGRITY");
  return effect(
    "tool-entry",
    {
      tool: fact.tool,
      target: fact.target,
      author: fact.actor,
      text: "",
      silent: true,
      detail: { custodyBatch: facts },
    },
    fact.actor,
    // Custody causes name sessions or maintenance reasons, not facts in this journal.
  );
}
function commitBoundary() {
  let depth = 0,
    additions = 0;
  let callbacks: (() => void)[] = [];
  return {
    pending: () => depth > 0,
    addition: () => {
      if (depth && additions++) throw new CustodyError("E-CUSTODY-TRANSACTION");
    },
    afterCommit: (work: () => void) => {
      if (depth) callbacks.push(work);
      else work();
    },
    transaction: <T>(work: () => T): T => {
      if (depth) return work();
      depth++;
      additions = 0;
      try {
        const result = work();
        depth--;
        const committed = callbacks;
        callbacks = [];
        committed.forEach(callback => callback());
        return result;
      } finally {
        depth = 0;
        additions = 0;
        callbacks = [];
      }
    },
  };
}
function incrementalFacts<P extends Foreign>(
  replay: (after?: number) => readonly Event<P>[],
  afterCommit: (work: () => void) => void,
) {
  let cursor = { count: 0, seq: 0 };
  return (count: number) => {
    const base = cursor.count <= count ? cursor : { count: 0, seq: 0 };
    const events = replay(base.seq).filter(event => event.seq > base.seq);
    const facts = readFacts(events);
    const tail = facts.slice(count - base.count);
    const last = events.at(-1)?.seq ?? base.seq;
    afterCommit(() => {
      if (last >= cursor.seq) cursor = { count: count + tail.length, seq: last };
    });
    return tail;
  };
}
function publicEntry<P extends Foreign>(
  entry: Emission<P>,
  owned: WeakSet<object>,
  otherwise: (entry: Emission<P>) => Emission<P>,
) {
  if (owned.has(entry)) return entry;
  if (entry.layer === "house" && entry.kind === "tool-entry") {
    const detail = entry.data.detail;
    if (detail && typeof detail === "object" && ("custodyFact" in detail || "custodyBatch" in detail))
      throw new CustodyError("E-CUSTODY-DENIED");
  }
  return otherwise(entry);
}
/** Custody facts ride existing silent entries, so they share the action's journal transaction. */
export function credentialJournal<P extends Foreign>(
  replay: (after?: number) => readonly Event<P>[],
  append: (entry: Emission<P>) => unknown,
) {
  let emit = append;
  const owned = new WeakSet<object>();
  const boundary = commitBoundary();
  const ledger: CredentialLedger = {
    pending: boundary.pending,
    afterCommit: boundary.afterCommit,
    facts: () => readFacts(replay()),
    factsAfter: incrementalFacts(replay, boundary.afterCommit),
    append: fact => ledger.appendBatch?.([fact]),
    appendBatch: facts => {
      boundary.addition();
      const entry = factEntry(facts);
      owned.add(entry);
      try {
        emit(entry);
      } finally {
        owned.delete(entry);
      }
    },
  };
  return {
    ledger,
    transaction: boundary.transaction,
    write: (entry: Emission<P>, otherwise: (entry: Emission<P>) => Emission<P>) => publicEntry(entry, owned, otherwise),
    publish: (publish: typeof append) => {
      emit = publish;
    },
  };
}
