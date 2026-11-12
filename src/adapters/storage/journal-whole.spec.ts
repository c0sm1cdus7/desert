// A fact that does not fold is never kept, and what is written together stays whole or not at all.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteJournal } from "./journal-store.ts";
import { shop, type ShopEvent, type ShopFact } from "../../../tests/support/shop.ts";

const homes: string[] = [];
const opened: { close(): void }[] = [];
afterEach(() => {
  opened.splice(0).forEach(resource => resource.close());
  homes.splice(0).forEach(path => rmSync(path, { recursive: true, force: true }));
});
/** A journal whose one fold counts the sales and refuses the one called s9. */
const open = (file: string) => {
  const journal = new SqliteJournal<ShopFact>(file, shop);
  opened.push(journal);
  const sales = journal.watch("sales", 0, (count: number, event: ShopEvent) => {
    if (event.kind !== "sale-registered") return count;
    if (event.data.sale === "s9") throw new Error("s9 does not fold");
    return count + 1;
  });
  journal.restore();
  return { journal, sales };
};
const sale = (name: string) => shop.fact("sale-registered", { sale: name, total: 10 }, "ana");
const kinds = (journal: SqliteJournal<ShopFact>) =>
  journal.replay<string[]>([], (all, event) => [...all, `${event.seq}:${event.kind}`]);

describe("a fact that does not fold", () => {
  it("is not written: the journal and what is folded stay as they were, and the next fact takes its place", () => {
    const { journal, sales } = open(":memory:");
    journal.append(sale("s1"), 100);
    expect(() => journal.append(sale("s9"), 100)).toThrow("s9 does not fold");
    expect([kinds(journal), sales()]).toEqual([["1:sale-registered"], 1]);
    expect(journal.append(sale("s2"), 100).seq).toBe(2);
    expect(sales()).toBe(2);
  });

  it("takes with it everything written together with it, and a house that refused it opens again", () => {
    const file = join(mkdtempSync(join(tmpdir(), "desert-whole-")), "journal.sqlite");
    homes.push(join(file, ".."));
    const first = open(file);
    first.journal.append(sale("s1"), 100);
    const both = (): void => {
      first.journal.append(sale("s2"), 100);
      first.journal.append(sale("s9"), 100);
    };
    expect(() => first.journal.batch(both)).toThrow("s9 does not fold");
    expect([kinds(first.journal), first.sales()]).toEqual([["1:sale-registered"], 1]);
    first.journal.batch(() => [sale("s3"), sale("s4")].forEach(fact => first.journal.append(fact, 100)));
    expect(first.sales()).toBe(3);
    opened.splice(0).forEach(resource => resource.close());
    const again = open(file);
    expect([kinds(again.journal).length, again.sales()]).toEqual([3, 3]);
  });
});
