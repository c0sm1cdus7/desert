// A synchronous race in independent OS processes, including close/unlink against the next open/lstat.
import { SqliteJournal } from "../../src/adapters/storage/journal-store.ts";
import { WriterAlreadyOpen } from "../../src/adapters/storage/writer-lease.ts";
import { shop } from "./shop.ts";
const [file, count] = process.argv.slice(2);
if (!file || !count) throw new Error("Missing race arguments");
process.once("message", () => {
  let opened = 0;
  let rejected = 0;
  const errors: string[] = [];
  for (let n = 0; n < Number(count); n++) {
    let journal: SqliteJournal | undefined;
    try {
      journal = new SqliteJournal(file, shop);
      journal.append(shop.fact("sale-registered", { sale: `${process.pid}-${n}`, total: 1 }, "ana"), n);
      opened++;
    } catch (error) {
      if (error instanceof WriterAlreadyOpen) rejected++;
      else errors.push(String(error));
    } finally {
      journal?.close();
    }
  }
  process.send?.({ opened, rejected, errors });
  process.disconnect();
});
process.send?.("ready");
