import { secretTexts } from "../../../texts/secrets/secrets.texts.ts";
import type { CustodyState } from "./custody-state.ts";
import { CustodyError, type LedgerHead } from "./house-keys.ts";
import { migrateFieldVault } from "./custody-migration.ts";
import { retryCleanup } from "./custody-cleanup.ts";
import { latestBindings, restoredFacts } from "./custody-restoration.ts";
/** Chain and anchor precede key presence; only explicit acceptance may retire missing keys. */
export function openCustody(state: CustodyState, restore = false, expected?: LedgerHead, cleanup = true): void {
  if (state.store.keyCheck()) state.cipher.prepare(false);
  if (restore) {
    if (!expected) throw new CustodyError("E-CUSTODY-DENIED");
    state.ledger.acceptRestored(
      facts => restoredFacts(state, facts),
      expected,
      () => retryCleanup(state),
    );
  }
  const facts = state.ledger.facts();
  const retired = new Set(
    facts
      .filter(fact => fact.kind === "credential-cleanup-pending" && fact.cause === "restored-without-key")
      .flatMap(fact => Object.values(fact.refs)),
  );
  const rows = state.store.rows();
  for (const row of rows)
    if (row.payload !== null) {
      state.cipher.check(row.ref, row.payload);
      if (!retired.has(row.ref) && !state.cipher.present(row.ref))
        throw new CustodyError("E-CUSTODY-KEY", secretTexts.missingKey);
    }
  const present = new Set(rows.filter(row => row.payload !== null && !retired.has(row.ref)).map(row => row.ref));
  for (const fact of latestBindings(facts))
    if (Object.values(fact.refs).some(ref => !present.has(ref))) throw new CustodyError("E-CUSTODY-MISSING");
  migrateFieldVault(state);
  if (cleanup) retryCleanup(state);
}
