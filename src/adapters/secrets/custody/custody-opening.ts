import type { CustodyState } from "./custody-state.ts";
import { CustodyError } from "./house-keys.ts";
import { migrateFieldVault } from "./custody-migration.ts";
import { retryCleanup } from "./custody-cleanup.ts";
/** Inspect encrypted envelopes without fetching their encryption keys or producing plaintext. */
export function openCustody(state: CustodyState, restore = false): void {
  if (state.store.keyCheck()) state.cipher.prepare(false);
  const rows = state.store.rows();
  for (const row of rows)
    if (row.payload !== null) {
      state.cipher.check(row.ref, row.payload);
      if (!state.cipher.present(row.ref)) throw new CustodyError("E-CUSTODY-KEY");
    }
  const present = new Set(rows.filter(row => row.payload !== null).map(row => row.ref));
  const check = (facts: ReturnType<typeof state.ledger.facts>) => {
    const bindings = new Map<string, (typeof facts)[number]>();
    for (const fact of facts)
      if (fact.kind === "credential-bound" || fact.kind === "credential-released")
        bindings.set(JSON.stringify([fact.actor, fact.tool, fact.target, fact.slot]), fact);
    for (const fact of bindings.values()) {
      if (fact.kind !== "credential-bound") continue;
      if (Object.values(fact.refs).some(ref => !present.has(ref))) throw new CustodyError("E-CUSTODY-MISSING");
    }
  };
  if (restore) state.ledger.acceptRestored(check);
  else check(state.ledger.facts());
  migrateFieldVault(state);
  retryCleanup(state);
}
