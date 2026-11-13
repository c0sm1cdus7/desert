// Real processes meet before opening; the audit pause preserves the actual filesystem observation.
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { join } from "node:path";
import { shop } from "./shop.ts";
const [file, barrier, role, mode] = process.argv.slice(2);
if (!file || !barrier || !role) throw new Error("Missing child fixture arguments");
const exists = fs.existsSync;
let first = true;
if (mode === "audit") {
  fs.existsSync = path => {
    const observed = exists(path);
    if (first && String(path).endsWith("/journal.lock")) {
      first = false;
      process.send?.(`observed:${String(observed)}`);
      const end = Date.now() + 15_000;
      while (!exists(join(barrier, `${role}.go`))) {
        if (Date.now() > end) throw new Error("Audit barrier expired");
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
      }
    }
    return observed;
  };
  syncBuiltinESMExports();
}
const { SqliteJournal } = await import("../../src/adapters/storage/journal-store.ts");
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
  } else if (message === "write") {
    for (let n = 0; n < 101; n++)
      journal?.append(shop.fact("sale-registered", { sale: `${role}${n}`, total: 10 }, "ana"), n);
    process.send?.("wrote");
  } else if (message === "close") {
    journal?.close();
    process.disconnect();
  }
});
process.send?.("ready");
