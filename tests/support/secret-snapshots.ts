// Observe actual saved folds, including their Maps, without reading the synthetic vault.
import { DatabaseSync } from "node:sqlite";
import { deserialize } from "node:v8";
import { join } from "node:path";
export function secretSnapshots(path: string): unknown[] {
  const db = new DatabaseSync(join(path, "journal.sqlite"), { readOnly: true });
  try {
    return db
      .prepare("select state from snapshots")
      .all()
      .map(row => {
        if (!(row.state instanceof Uint8Array)) throw new Error("Missing saved fold");
        const snapshot: unknown = deserialize(row.state);
        /** Format 4 keeps the fold inside a checksummed envelope: its payload is the fold that was saved. */
        const payload =
          typeof snapshot === "object" && snapshot !== null && "payload" in snapshot ? snapshot.payload : undefined;
        const fold: unknown = payload instanceof Uint8Array ? deserialize(payload) : snapshot;
        return fold;
      });
  } finally {
    db.close();
  }
}
