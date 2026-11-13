import type { CustodyState } from "./custody-state.ts";
import { secretRef } from "./custody-database.ts";
import { readMaterial } from "./custody-access.ts";
import { CustodyError } from "./house-keys.ts";
/** Keep the original table until every encrypted copy has been read and compared, including on resume. */
export function migrateFieldVault(state: CustodyState): void {
  const db = state.store.db;
  if (!db.prepare("select name from sqlite_master where type='table' and name='secrets'").get()) return;
  const rows = db.prepare("select id, value from secrets").all();
  if (rows.length) state.prepareKey();
  for (const row of rows) {
    if (!secretRef(row.id) || typeof row.value !== "string") throw new CustodyError("E-CUSTODY-LEGACY");
    const copy = state.store.rows().find(copy => copy.ref === row.id);
    if (!copy) state.store.intent(row.id, null, true);
    if (!copy?.payload) state.store.put(row.id, state.cipher.seal(row.id, row.value, false));
    if (readMaterial(state, row.id) !== row.value) throw new CustodyError("E-CUSTODY-INTEGRITY");
  }
  // secure_delete clears freed cells; VACUUM and WAL truncation remove the previous pages from this live store.
  // An empty legacy table is the durable marker that compaction still needs to be retried after a cut.
  state.store.retireLegacy();
  state.store.compactLegacy();
}
