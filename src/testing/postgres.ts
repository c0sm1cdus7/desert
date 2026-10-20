import { Pool } from "pg";
import { openLocalController } from "../local.ts";
import { postgresCluster } from "./postgres-cluster.ts";
import type { HostFactory, Receipt, StoredObject } from "./types.ts";

export function localPostgresTestHost(): HostFactory {
  return () => {
    const cluster = postgresCluster();
    return {
      revision: () => cluster.version(),
      async open(application, role) {
        const database = await cluster.database();
        const controller = await openLocalController(application, { ...database, role });
        const admin = new Pool({ host: database.socketDirectory, database: database.database, user: database.user,
          connectionTimeoutMillis: 3000, statement_timeout: 5000 });
        admin.on("error", () => {});
        return {
          controller, stop: cluster.stop, start: cluster.start,
          async snapshot() {
            const objects = await admin.query<StoredObject>("SELECT id, object_type, version, facts FROM desert_objects ORDER BY id");
            const receipts = await admin.query<{ result: Receipt }>("SELECT result FROM desert_receipts ORDER BY intent_id");
            return { objects: objects.rows, receipts: receipts.rows.map(row => row.result) };
          },
          async rejectReceipts(enabled) {
            if (enabled) await admin.query(`CREATE FUNCTION verification_receipt_fault() RETURNS trigger LANGUAGE plpgsql AS
              $$ BEGIN RAISE EXCEPTION 'VERIFICATION_RECEIPT_FAULT'; END $$;
              CREATE TRIGGER verification_receipt_fault BEFORE INSERT ON desert_receipts
              FOR EACH ROW EXECUTE FUNCTION verification_receipt_fault()`);
            else await admin.query("DROP TRIGGER verification_receipt_fault ON desert_receipts; DROP FUNCTION verification_receipt_fault()");
          },
          async close() {
            cluster.start();
            try { await controller.close(); } finally { await admin.end(); }
          },
        };
      },
      async close() { cluster.dispose(); },
    };
  };
}
