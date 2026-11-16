import { expect, it } from "vitest";
import { credentialJournal } from "../adapters/credential-journal.ts";
import { SqliteJournal } from "../storage/journal-store.ts";
import { vocabulary, type Event } from "./facts.ts";
import { journalCauses } from "../../tests/support/journal-causes.ts";

it("a custody session stays in the custody fact and is never a nonexistent journal cause", () => {
  const journal = new SqliteJournal(":memory:", vocabulary({}));
  const facts = () => journal.replay<Event<never>[]>([], (all, event) => [...all, event]);
  const bridge = credentialJournal<never>(facts, entry => journal.append(entry, 100));
  try {
    bridge.ledger.append({
      id: "binding",
      kind: "credential-bound",
      actor: "ana",
      tool: "vault",
      target: "vault",
      slot: "signing",
      revision: 1,
      refs: {},
      cause: "custody-session",
    });
    expect(bridge.ledger.facts()[0]?.cause).toBe("custody-session");
    expect(facts()).toHaveLength(1);
    journalCauses(facts());
  } finally {
    journal.close();
  }
});
