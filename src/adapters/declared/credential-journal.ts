import { Value } from "@sinclair/typebox/value";
import { effect, type Emission, type Event, type Foreign } from "../../journal/events.ts";
import type { CredentialFact, CredentialLedger } from "../secrets/custody/custody-contract.ts";
import { factSchema } from "../secrets/custody/custody-database.ts";
import { CustodyError } from "../secrets/custody/house-keys.ts";
function readFacts<P extends Foreign>(events: readonly Event<P>[]): CredentialFact[] {
  return events.flatMap((event): CredentialFact[] => {
    if (event.kind !== "tool-entry" || event.layer !== "house") return [];
    const detail = event.data.detail;
    if (!detail || typeof detail !== "object" || !("custodyFact" in detail)) return [];
    if (!Value.Check(factSchema, detail.custodyFact)) throw new CustodyError("E-CUSTODY-INTEGRITY");
    return [detail.custodyFact];
  });
}
function factEntry(fact: CredentialFact) {
  return effect(
    "tool-entry",
    {
      tool: fact.tool,
      target: fact.target,
      author: fact.actor,
      text: "",
      silent: true,
      detail: { custodyFact: fact },
    },
    fact.actor,
    [fact.cause],
  );
}
/** Custody facts ride existing silent entries, so they share the action's journal transaction. */
export function credentialJournal<P extends Foreign>(
  replay: () => readonly Event<P>[],
  append: (entry: Emission<P>) => unknown,
) {
  let emit = append;
  const owned = new WeakSet<object>();
  const ledger: CredentialLedger = {
    facts: () => readFacts(replay()),
    append: fact => {
      const entry = factEntry(fact);
      owned.add(entry);
      try {
        emit(entry);
      } finally {
        owned.delete(entry);
      }
    },
  };
  const write = (entry: Emission<P>, otherwise: (entry: Emission<P>) => Emission<P>) => {
    if (owned.has(entry)) return entry;
    if (entry.layer === "house" && entry.kind === "tool-entry") {
      const detail = entry.data.detail;
      if (detail && typeof detail === "object" && "custodyFact" in detail) throw new CustodyError("E-CUSTODY-DENIED");
    }
    return otherwise(entry);
  };
  return {
    ledger,
    write,
    publish: (publish: typeof append) => {
      emit = publish;
    },
  };
}
