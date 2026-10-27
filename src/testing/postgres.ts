import { Pool } from "pg";
import { loadDefinition } from "../compiled-definition.ts";
import { openLocalController } from "../local.ts";
import { objectStorage } from "../storage/ddl.ts";
import { readAllObjects } from "../storage/object-store.ts";
import { renderWriteFault, renderWriteFaultRemoval } from "../storage/render-faults.ts";
import { receiptsTable } from "../storage/tables/local.ts";
import { postgresCluster } from "./postgres-cluster.ts";
import type { HostFactory, Receipt } from "./types.ts";

const receiptFault = { name: "verification_receipt_fault", event: "INSERT", message: "VERIFICATION_RECEIPT_FAULT" } as const;

export function localPostgresTestHost(): HostFactory {
  return () => {
    const cluster = postgresCluster();
    return {
      revision: () => cluster.version(),
      async open(application, role) {
        const database = await cluster.database();
        const controller = await openLocalController(application, { ...database, roles: [role] });
        const storage = objectStorage(loadDefinition(application), database.installation);
        const admin = new Pool({ host: database.socketDirectory, database: database.database, user: database.user,
          connectionTimeoutMillis: 3000, statement_timeout: 5000 });
        admin.on("error", () => {});
        return {
          controller, stop: cluster.stop, start: cluster.start,
          async snapshot() {
            const objects = await readAllObjects(admin, storage);
            const receipts = await admin.query<{ result: Receipt }>("SELECT result FROM desert_receipts ORDER BY intent_id");
            return { objects, receipts: receipts.rows.map(row => row.result) };
          },
          async rejectReceipts(enabled) {
            await admin.query(enabled ? renderWriteFault(receiptsTable, receiptFault) : renderWriteFaultRemoval(receiptsTable, receiptFault));
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
