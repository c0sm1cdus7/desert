import { timingSafeEqual } from "node:crypto";
import type { CustodyState } from "./custody-state.ts";
import { secretRef } from "./custody-database.ts";
import { readMaterial } from "./custody-access.ts";
import { CustodyError } from "./house-keys.ts";
/** SQLite casts the old text to bytes before crossing the process boundary; one row at a time. */
export function migrateFieldVault(state: CustodyState): void {
  const db = state.store.db;
  if (!db.prepare("select name from sqlite_master where type='table' and name='secrets'").get()) return;
  for (const row of db.prepare("select id, cast(value as blob) as material from secrets").iterate()) {
    let decoded: Uint8Array | undefined;
    try {
      if (!secretRef(row.id) || !(row.material instanceof Uint8Array)) throw new CustodyError("E-CUSTODY-LEGACY");
      state.prepareKey();
      const copy = state.store.row(row.id);
      if (!copy) state.store.intent(row.id, null, true);
      if (!copy?.payload) state.store.put(row.id, state.cipher.seal(row.id, Uint8Array.from(row.material), true));
      decoded = readMaterial(state, row.id);
      if (decoded.length !== row.material.length || !timingSafeEqual(decoded, row.material))
        throw new CustodyError("E-CUSTODY-INTEGRITY");
    } finally {
      decoded?.fill(0);
      if (row.material instanceof Uint8Array) row.material.fill(0);
    }
  }
  state.store.retireLegacy();
  state.store.compactLegacy();
}
