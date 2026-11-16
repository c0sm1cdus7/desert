// A disposable writer killed after releasing an inner savepoint but before committing its outer write.
import { SqliteJournal } from "../../src/adapters/storage/journal-store.ts";
import { shop } from "./shop.ts";
const file = process.argv[2];
if (!file) throw new Error("Missing test journal");
const journal = new SqliteJournal(file, shop);
const sale = (name: string) => shop.fact("sale-registered", { sale: name, total: 10 }, "ana");
journal.append(sale("committed"), 100);
journal.batch(() => {
  journal.append(sale("outer"), 100);
  journal.batch(() => journal.append(sale("inner"), 100));
  process.kill(process.pid, "SIGKILL");
});
