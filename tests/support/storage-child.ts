// Real processes stop immediately before SQLite acquires the sidecar, without a production test hook.
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { journalTexts } from "../../src/texts/journal.texts.ts";
import { shop } from "./shop.ts";
const [file, barrier, role, mode] = process.argv.slice(2);
if (!file || !barrier || !role) throw new Error("Missing child fixture arguments");
const exec: unknown = Reflect.get(DatabaseSync.prototype, "exec");
if (typeof exec !== "function") throw new Error("SQLite exec is missing");
let first = true;
if (mode === "lease") {
  DatabaseSync.prototype.exec = function (sql) {
    if (first && sql === journalTexts.writerLeaseSql) {
      first = false;
      process.send?.("acquiring");
      const end = Date.now() + 15_000;
      while (!existsSync(join(barrier, `${role}.go`))) {
        if (Date.now() > end) throw new Error("Lease barrier expired");
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
      }
    }
    Reflect.apply(exec, this, [sql]);
  };
}
const { SqliteJournal } = await import("../../src/storage/journal-store.ts");
let transaction: DatabaseSync | undefined;
let journal: InstanceType<typeof SqliteJournal> | undefined;
process.on("message", message => {
  if (message === "open") {
    try {
      journal = new SqliteJournal(file, shop);
      journal.watch("sales", 0, (n, e) => n + Number(e.kind === "sale-registered"));
      journal.restore();
      process.send?.("opened");
    } catch (error) {
      process.send?.(error instanceof Error ? error.message : String(error));
    }
  } else if (message === "begin") {
    transaction = new DatabaseSync(file);
    transaction.exec("begin immediate");
    process.send?.("writing");
  } else if (message === "write") {
    for (let n = 0; n < 101; n++)
      journal?.append(shop.fact("sale-registered", { sale: `${role}${n}`, total: 10 }, "ana"), n);
    process.send?.("wrote");
  } else if (message === "close") {
    transaction?.close();
    journal?.close();
    process.disconnect();
  }
});
process.send?.("ready");
